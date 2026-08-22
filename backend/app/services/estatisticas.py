# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

from datetime import datetime, timezone
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models.auth import PAPEL_ADMINISTRADOR, PAPEL_CONSULTOR

# ---------------------------------------------------------------------------
# Funções puras (sem acesso a banco) usadas por GET /admin/estatisticas —
# recebem dados já buscados pelo blueprint (que monta o dict completo em
# _montar_estatisticas_completas, blueprints/admin.py — reaproveitado tanto
# pela rota JSON quanto pela de exportação em PDF abaixo) e fazem só a
# contagem/formatação, para poderem ser testadas sem depender de uma conexão
# real com o banco (mesmo padrão de app/services/k_anonimato.py:aplicar_k_anonimato).
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


def gerar_relatorio_pdf(dados: dict) -> bytes:
    """PDF "como uma impressão" da Visão geral (mesmo dict de
    GET /admin/estatisticas) — só formatação, sem acesso a banco. Usa
    reportlab (única dependência de geração de PDF do projeto, escolhida
    por ser .whl Python puro, sem dependência nativa de sistema — seguro
    no build padrão do Render, que não tem Dockerfile). Paginação
    automática do Platypus conforme o conteúdo cresce (ex.: ranking de
    instituições longo)."""
    buffer = BytesIO()
    documento = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
    )
    estilos = getSampleStyleSheet()
    agora = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")

    historia = [
        Paragraph("PROTEGER-NR1 EPT — Relatório de Visão Geral", estilos["Title"]),
        Paragraph(f"Gerado em {agora}", estilos["Normal"]),
        Spacer(1, 1 * cm),
        Paragraph("Resumo", estilos["Heading2"]),
        Table(
            [
                ["Instituições", str(dados["instituicoes"]["total"]), f"{dados['instituicoes']['ativas']} ativas"],
                ["Questionários", str(dados["questionarios"]["total"]), f"{dados['questionarios']['ativos']} ativos"],
                [
                    "Usuários",
                    str(dados["usuarios"]["consultores"] + dados["usuarios"]["administradores"]),
                    f"{dados['usuarios']['consultores']} consultores, "
                    f"{dados['usuarios']['administradores']} administradores",
                ],
                [
                    "Respostas",
                    str(dados["respostas"]["total"]),
                    f"{dados['respostas']['ultimos_7_dias']} nos últimos 7 dias, "
                    f"{dados['respostas']['ultimos_30_dias']} nos últimos 30 dias",
                ],
            ],
            colWidths=[4 * cm, 3 * cm, 9 * cm],
            style=TableStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                ]
            ),
        ),
        Spacer(1, 0.5 * cm),
    ]

    grupos_abaixo = dados["k_anonimato"]["grupos_abaixo_threshold"]
    if grupos_abaixo > 0:
        plural = "s" if grupos_abaixo != 1 else ""
        historia.append(
            Paragraph(
                f"{grupos_abaixo} grupo{plural} aguardando mais respostas para atingir o limiar de "
                f"k-anonimato atual ({dados['k_anonimato']['threshold_atual']}).",
                estilos["Normal"],
            )
        )
        historia.append(Spacer(1, 0.5 * cm))

    historia.append(Paragraph("Respostas por instituição", estilos["Heading2"]))
    por_instituicao = dados["por_instituicao"]
    if por_instituicao:
        linhas_tabela = [["Instituição", "Respostas"]] + [
            [linha["nome"], str(linha["total_respostas"])] for linha in por_instituicao
        ]
        historia.append(
            Table(
                linhas_tabela,
                colWidths=[12 * cm, 4 * cm],
                style=TableStyle(
                    [
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                        ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ]
                ),
            )
        )
    else:
        historia.append(Paragraph("Ainda não há respostas registradas.", estilos["Normal"]))

    documento.build(historia)
    return buffer.getvalue()
