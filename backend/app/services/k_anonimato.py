from datetime import datetime, timezone

from flask import current_app

from app.extensions import db
from app.models.anonimo import (
    ConfiguracaoSistema,
    Dominio,
    Questionario,
    ResultadoAgregado,
    RespostaBruta,
    Setor,
)
from app.services.instrumentos import obter_estrategia

PERIODO_CONSOLIDADO = "consolidado"

# ---------------------------------------------------------------------------
# Regra de negócio inegociável (docs/05): toda leitura de resultado agregado
# passa por este módulo. Se n_respostas < threshold configurado, o valor
# retornado é sempre `None`/`resultado_disponivel: False` — mesmo que a
# chamada venha de dentro do próprio backend. O threshold é sempre lido do
# banco (nunca de env var, nunca de cache) para refletir imediatamente
# qualquer alteração feita pelo Administrador.
# ---------------------------------------------------------------------------


def obter_configuracao() -> ConfiguracaoSistema:
    config = db.session.get(ConfiguracaoSistema, 1)
    if config is None:
        config = ConfiguracaoSistema(
            id=1,
            k_anonimato_threshold=current_app.config["K_ANONIMATO_THRESHOLD_DEFAULT"],
            ia_sugestao_questionario_enabled=False,
            ia_analise_resultados_enabled=False,
            ia_chat_enabled=False,
            llm_provider=current_app.config["LLM_PROVIDER_DEFAULT"],
            llm_api_key=current_app.config["LLM_API_KEY_DEFAULT"],
            llm_base_url=current_app.config["LLM_BASE_URL_DEFAULT"],
        )
        db.session.add(config)
        db.session.commit()
    return config


def obter_threshold() -> int:
    return obter_configuracao().k_anonimato_threshold


def aplicar_k_anonimato(n_respostas: int, valor_agregado, threshold: int = None) -> dict:
    """Ponto único de decisão: um resultado só é exibido se n_respostas >=
    threshold. Retorna sempre o mesmo formato (docs/07)."""
    if threshold is None:
        threshold = obter_threshold()

    disponivel = n_respostas >= threshold
    return {
        "n_respostas": n_respostas,
        "threshold": threshold,
        "resultado_disponivel": disponivel,
        "valor_agregado": valor_agregado if disponivel else None,
    }


def recalcular_resultados(instituicao_id: int, setor_id: int, questionario_id: int) -> None:
    """Recalcula e persiste (upsert) os resultados agregados de um grupo
    (instituição + setor + questionário), a partir das respostas brutas
    atuais. Chamado após cada nova resposta (POST /respostas)."""
    questionario = db.session.get(Questionario, questionario_id)
    if questionario is None:
        raise ValueError(f"Questionário {questionario_id} não encontrado.")

    respostas = (
        db.session.query(RespostaBruta)
        .filter_by(
            instituicao_id=instituicao_id,
            setor_id=setor_id,
            questionario_id=questionario_id,
        )
        .all()
    )
    n_respostas = len(respostas)
    payloads = [r.payload_json for r in respostas]

    estrategia = obter_estrategia(questionario.instrumento)
    resultado = estrategia.calcular(respostas=payloads, dominios=questionario.dominios)

    agora = datetime.now(timezone.utc)

    def _upsert(dominio_id, valor_agregado):
        linha = (
            db.session.query(ResultadoAgregado)
            .filter_by(
                instituicao_id=instituicao_id,
                setor_id=setor_id,
                questionario_id=questionario_id,
                dominio_id=dominio_id,
                periodo=PERIODO_CONSOLIDADO,
            )
            .first()
        )
        if linha is None:
            linha = ResultadoAgregado(
                instituicao_id=instituicao_id,
                setor_id=setor_id,
                questionario_id=questionario_id,
                dominio_id=dominio_id,
                periodo=PERIODO_CONSOLIDADO,
            )
            db.session.add(linha)
        linha.valor_agregado = valor_agregado
        linha.n_respostas = n_respostas
        linha.calculado_em = agora

    for dominio_id, valor_agregado in resultado["por_dominio"].items():
        _upsert(dominio_id, valor_agregado)

    if resultado["geral"] is not None:
        _upsert(None, resultado["geral"])

    db.session.commit()


def obter_resultados(instituicao_id: int, setor_id: int = None) -> list[dict]:
    """Leitura de resultados agregados, sempre filtrada por k-anonimato no
    momento da consulta (não apenas no momento em que foram calculados).

    Inclui `setor_nome`/`dominio_nome` (além dos ids) — Consultor e
    Administrador têm permissão para ver a identidade do instrumento/domínio
    (docs/04, ao contrário do Usuário respondente, que nunca vê nem
    instrumento nem resultado); nomear aqui evita que cada tela cliente
    precise resolver os ids numa segunda chamada."""
    consulta = db.session.query(ResultadoAgregado).filter_by(
        instituicao_id=instituicao_id
    )
    if setor_id is not None:
        consulta = consulta.filter_by(setor_id=setor_id)

    threshold = obter_threshold()
    linhas = consulta.all()

    setor_ids = {linha.setor_id for linha in linhas}
    dominio_ids = {linha.dominio_id for linha in linhas if linha.dominio_id is not None}

    nomes_setor = {
        s.id: s.nome
        for s in db.session.query(Setor.id, Setor.nome).filter(Setor.id.in_(setor_ids)).all()
    }
    nomes_dominio = {
        d.id: d.nome
        for d in db.session.query(Dominio.id, Dominio.nome)
        .filter(Dominio.id.in_(dominio_ids))
        .all()
    }

    saida = []
    for linha in linhas:
        gate = aplicar_k_anonimato(linha.n_respostas, linha.valor_agregado, threshold)
        saida.append(
            {
                "instituicao_id": linha.instituicao_id,
                "setor_id": linha.setor_id,
                "setor_nome": nomes_setor.get(linha.setor_id),
                "questionario_id": linha.questionario_id,
                "dominio_id": linha.dominio_id,
                "dominio_nome": nomes_dominio.get(linha.dominio_id)
                if linha.dominio_id is not None
                else None,
                "periodo": linha.periodo,
                **gate,
            }
        )
    return saida
