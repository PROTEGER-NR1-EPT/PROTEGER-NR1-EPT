# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

from collections import defaultdict

from app.extensions import db
from app.models.anonimo import Dominio, Instituicao, Questionario, ResultadoAgregado, Setor
from app.models.auth import LogAtividade
from app.services.exportacao import formatar_csv, nome_arquivo_timestamp
from app.services.instrumentos import calcular_risco_dominio
from app.services.k_anonimato import aplicar_k_anonimato, obter_threshold

# ---------------------------------------------------------------------------
# Dashboard "Resultados" do Administrador (docs/07) — diferente de
# k_anonimato.py:obter_resultados (escopado a UMA instituição), este serviço
# aceita listas de ids (instituição/setor/questionário) e um filtro de
# instrumento, para comparar vários grupos ao mesmo tempo num só
# radar/mapa de risco. Cada grupo ainda passa individualmente pelo filtro de
# k-anonimato antes de entrar em qualquer média/agregação no frontend — nunca
# soma n_respostas de grupos diferentes antes de aplicar o threshold (mesma
# garantia de privacidade de sempre).
# ---------------------------------------------------------------------------


def _questionarios_por_instrumento(questionario_ids, instrumento):
    """Resolve quais questionario_id passam no filtro de instrumento
    ('karasek'/'copsoq' = só questionários puros daquele instrumento;
    'misto' = questionários com domínios de mais de um instrumento),
    combinando por interseção com `questionario_ids` quando fornecido."""
    consulta = db.session.query(Dominio.questionario_id, Dominio.instrumento)
    if questionario_ids:
        consulta = consulta.filter(Dominio.questionario_id.in_(questionario_ids))

    instrumentos_por_questionario = defaultdict(set)
    for questionario_id, instrumento_dominio in consulta.all():
        instrumentos_por_questionario[questionario_id].add(instrumento_dominio)

    permitidos = []
    for questionario_id, instrumentos in instrumentos_por_questionario.items():
        if instrumento == "misto":
            if len(instrumentos) > 1:
                permitidos.append(questionario_id)
        elif instrumentos == {instrumento}:
            permitidos.append(questionario_id)
    return permitidos


def obter_resultados_dashboard(
    instituicao_ids: list[int] = None,
    setor_ids: list[int] = None,
    questionario_ids: list[int] = None,
    instrumento: str = None,
) -> list[dict]:
    """Lista, por dimensão (domínio), os resultados agregados que atendem
    aos filtros informados — todos opcionais; nenhum filtro = todo o
    sistema. Cada item já vem com `risco`/`nivel_risco` (escala unificada
    0-100 comparável entre instrumentos, calculada em
    services/instrumentos/calcular_risco_dominio, nunca gravada em
    resultados_agregados) e os nomes já resolvidos (instituição, setor,
    questionário, domínio) — visão de Administrador, não do respondente."""
    questionario_ids_finais = questionario_ids
    if instrumento:
        questionario_ids_finais = _questionarios_por_instrumento(questionario_ids, instrumento)
        if not questionario_ids_finais:
            return []

    consulta = (
        db.session.query(ResultadoAgregado, Dominio)
        .join(Dominio, ResultadoAgregado.dominio_id == Dominio.id)
        # Linhas "geral" (ex.: quadrante do Karasek, dominio_id nulo) ficam
        # fora — este dashboard é por dimensão; o quadrante continua só na
        # tela de resultados por instituição já existente.
    )
    if instituicao_ids:
        consulta = consulta.filter(ResultadoAgregado.instituicao_id.in_(instituicao_ids))
    if setor_ids:
        consulta = consulta.filter(ResultadoAgregado.setor_id.in_(setor_ids))
    if questionario_ids_finais:
        consulta = consulta.filter(ResultadoAgregado.questionario_id.in_(questionario_ids_finais))

    linhas = consulta.all()
    if not linhas:
        return []

    threshold = obter_threshold()

    nomes_instituicao = {
        i.id: i.nome
        for i in db.session.query(Instituicao.id, Instituicao.nome)
        .filter(Instituicao.id.in_({r.instituicao_id for r, _ in linhas}))
        .all()
    }
    nomes_setor = {
        s.id: s.nome
        for s in db.session.query(Setor.id, Setor.nome)
        .filter(Setor.id.in_({r.setor_id for r, _ in linhas}))
        .all()
    }
    titulos_questionario = {
        q.id: q.titulo
        for q in db.session.query(Questionario.id, Questionario.titulo)
        .filter(Questionario.id.in_({r.questionario_id for r, _ in linhas}))
        .all()
    }

    saida = []
    for resultado, dominio in linhas:
        gate = aplicar_k_anonimato(resultado.n_respostas, resultado.valor_agregado, threshold)
        risco = nivel_risco = None
        if gate["resultado_disponivel"]:
            risco, nivel_risco = calcular_risco_dominio(dominio, gate["valor_agregado"])

        saida.append(
            {
                "instituicao_id": resultado.instituicao_id,
                "instituicao_nome": nomes_instituicao.get(resultado.instituicao_id, "?"),
                "setor_id": resultado.setor_id,
                "setor_nome": nomes_setor.get(resultado.setor_id, "?"),
                "questionario_id": resultado.questionario_id,
                "questionario_titulo": titulos_questionario.get(resultado.questionario_id, "?"),
                "dominio_id": dominio.id,
                "dominio_nome": dominio.nome,
                "instrumento": dominio.instrumento,
                "n_respostas": resultado.n_respostas,
                "threshold": threshold,
                "resultado_disponivel": gate["resultado_disponivel"],
                "risco": risco,
                "nivel_risco": nivel_risco,
            }
        )
    return saida


CABECALHO_RESULTADOS_CSV = [
    "instituicao_nome",
    "setor_nome",
    "questionario_titulo",
    "dominio_nome",
    "instrumento",
    "n_respostas",
    "threshold",
    "resultado_disponivel",
    "risco",
    "nivel_risco",
]


def exportar_resultados_csv(
    instituicao_ids: list[int],
    setor_ids: list[int],
    questionario_ids: list[int],
    instrumento: str,
    usuario_id: int,
) -> tuple[str, str]:
    """Mesmo recorte de dados de GET /admin/resultados (dashboard por
    dimensão), em CSV — já passa pelo filtro de k-anonimato dentro de
    obter_resultados_dashboard, então não exige a mesma confirmação de
    "dados sensíveis" da exportação de respostas brutas."""
    resultados = obter_resultados_dashboard(instituicao_ids, setor_ids, questionario_ids, instrumento)

    csv_texto = formatar_csv(
        CABECALHO_RESULTADOS_CSV,
        [
            [
                r["instituicao_nome"],
                r["setor_nome"],
                r["questionario_titulo"],
                r["dominio_nome"],
                r["instrumento"],
                r["n_respostas"],
                r["threshold"],
                r["resultado_disponivel"],
                r["risco"],
                r["nivel_risco"],
            ]
            for r in resultados
        ],
    )

    db.session.add(
        LogAtividade(
            usuario_id=usuario_id,
            acao="exportar_resultados_csv",
            entidade="resultados_dashboard",
            detalhes={
                "filtros": {
                    "instituicao_ids": instituicao_ids,
                    "setor_ids": setor_ids,
                    "questionario_ids": questionario_ids,
                    "instrumento": instrumento,
                },
                "total_linhas": len(resultados),
            },
        )
    )
    db.session.commit()

    return csv_texto, nome_arquivo_timestamp("resultados", "csv")
