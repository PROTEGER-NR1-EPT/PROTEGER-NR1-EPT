# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import json
from collections import defaultdict
from datetime import datetime, timezone

from flask import current_app

from app.extensions import db
from app.models.anonimo import (
    ConfiguracaoSistema,
    Dominio,
    Instituicao,
    Questionario,
    ResultadoAgregado,
    RespostaBruta,
    Setor,
)
from app.models.auth import LogAtividade
from app.services.exportacao import formatar_csv, nome_arquivo_timestamp
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


def _valores_padrao() -> dict:
    """Valores de fábrica de ConfiguracaoSistema, lidos das env vars atuais
    — usado tanto para criar a linha id=1 na primeira leitura (abaixo)
    quanto para devolvê-la ao padrão num reset de sistema
    (services/reset_sistema.py)."""
    return {
        "k_anonimato_threshold": current_app.config["K_ANONIMATO_THRESHOLD_DEFAULT"],
        "ia_sugestao_questionario_enabled": False,
        "ia_analise_resultados_enabled": False,
        "ia_chat_enabled": False,
        "llm_provider": current_app.config["LLM_PROVIDER_DEFAULT"],
        "llm_api_key": current_app.config["LLM_API_KEY_DEFAULT"],
        "llm_base_url": current_app.config["LLM_BASE_URL_DEFAULT"],
        "llm_model": current_app.config["LLM_MODEL_DEFAULT"],
    }


def obter_configuracao() -> ConfiguracaoSistema:
    config = db.session.get(ConfiguracaoSistema, 1)
    if config is None:
        config = ConfiguracaoSistema(id=1, **_valores_padrao())
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

    # Questionário misto: cada domínio carrega seu próprio instrumento
    # (Dominio.instrumento) — agrupa por instrumento e roda uma estratégia
    # por grupo, depois une os resultados (chaves de dominio_id são
    # disjuntas entre grupos, então a união de por_dominio é direta).
    grupos_por_instrumento = defaultdict(list)
    for dominio in questionario.dominios:
        grupos_por_instrumento[dominio.instrumento].append(dominio)

    por_dominio = {}
    gerais = {}
    for instrumento, dominios_grupo in grupos_por_instrumento.items():
        estrategia = obter_estrategia(instrumento)
        resultado_grupo = estrategia.calcular(respostas=payloads, dominios=dominios_grupo)
        por_dominio.update(resultado_grupo["por_dominio"])
        if resultado_grupo["geral"] is not None:
            gerais[instrumento] = resultado_grupo["geral"]

    # Caso comum (um só instrumento produz "geral", ex.: só Karasek):
    # mantém o formato plano de sempre, para não quebrar quem já consome
    # esse shape (frontend/src/utils/resultados.js, KarasekQuadrante.jsx).
    # Só embrulha por instrumento se mais de um grupo produzir "geral" ao
    # mesmo tempo — hoje não acontece (COPSOQ nunca produz "geral").
    geral = None
    if len(gerais) == 1:
        geral = next(iter(gerais.values()))
    elif len(gerais) > 1:
        geral = gerais

    resultado = {"por_dominio": por_dominio, "geral": geral}

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


def exportar_resultados_instituicao_csv(
    instituicao_id: int, setor_id: int, usuario_id: int
) -> tuple[str, str]:
    """Mesmo recorte de GET /admin/instituicoes/{id}/resultados (valores
    agregados crus por instrumento, incluindo a linha "geral" — ex.:
    quadrante do Karasek, que o dashboard de dimensões não tem), em CSV.
    `valor_agregado` varia de formato por instrumento/linha (média+
    classificação por domínio Karasek, quadrante na linha geral, escore+
    faixa no COPSOQ) — serializado como JSON numa coluna só, mais robusto
    que colunas esparsas."""
    instituicao = db.session.get(Instituicao, instituicao_id)
    nome_instituicao = instituicao.nome if instituicao else f"#{instituicao_id}"

    resultados = obter_resultados(instituicao_id, setor_id)

    csv_texto = formatar_csv(
        [
            "instituicao_nome",
            "setor_nome",
            "questionario_id",
            "dominio_nome",
            "periodo",
            "n_respostas",
            "threshold",
            "resultado_disponivel",
            "valor_agregado",
        ],
        [
            [
                nome_instituicao,
                r["setor_nome"],
                r["questionario_id"],
                r["dominio_nome"] or "Geral",
                r["periodo"],
                r["n_respostas"],
                r["threshold"],
                r["resultado_disponivel"],
                json.dumps(r["valor_agregado"], ensure_ascii=False) if r["valor_agregado"] else "",
            ]
            for r in resultados
        ],
    )

    db.session.add(
        LogAtividade(
            usuario_id=usuario_id,
            acao="exportar_resultados_instituicao_csv",
            entidade="instituicao",
            entidade_id=instituicao_id,
            detalhes={"setor_id": setor_id, "total_linhas": len(resultados)},
        )
    )
    db.session.commit()

    return csv_texto, nome_arquivo_timestamp(f"resultados_instituicao_{instituicao_id}", "csv")
