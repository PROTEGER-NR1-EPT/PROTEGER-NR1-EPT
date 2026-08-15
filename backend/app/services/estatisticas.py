from app.models.auth import PAPEL_ADMINISTRADOR, PAPEL_CONSULTOR

# ---------------------------------------------------------------------------
# Funções puras (sem acesso a banco) usadas por GET /admin/estatisticas —
# recebem dados já buscados pelo blueprint e fazem só a contagem, para
# poderem ser testadas sem depender de uma conexão real com o banco (mesmo
# padrão de app/services/k_anonimato.py:aplicar_k_anonimato).
# ---------------------------------------------------------------------------


def montar_totais(instituicoes_ativo, questionarios_ativo, usuarios_papel):
    return {
        "instituicoes": {
            "total": len(instituicoes_ativo),
            "ativas": sum(1 for ativo in instituicoes_ativo if ativo),
        },
        "questionarios": {
            "total": len(questionarios_ativo),
            "ativos": sum(1 for ativo in questionarios_ativo if ativo),
        },
        "usuarios": {
            "consultores": sum(1 for papel in usuarios_papel if papel == PAPEL_CONSULTOR),
            "administradores": sum(1 for papel in usuarios_papel if papel == PAPEL_ADMINISTRADOR),
        },
    }


def contar_grupos_abaixo_threshold(n_respostas_por_grupo, threshold: int) -> int:
    """`n_respostas_por_grupo`: um valor de n_respostas por grupo distinto
    (instituição + setor + questionário) — não por linha de
    ResultadoAgregado, já que um grupo tem uma linha por domínio, todas
    com o mesmo n_respostas.

    Conta só grupos com pelo menos 1 resposta e ainda abaixo do threshold
    (grupos com 0 respostas não "estão esperando" nada). Não recebe nem
    retorna quais grupos são — só a contagem, para não vazar tamanho de
    grupo pequeno associado a uma instituição/setor nomeados (docs/05)."""
    return sum(1 for n in n_respostas_por_grupo if 0 < n < threshold)
