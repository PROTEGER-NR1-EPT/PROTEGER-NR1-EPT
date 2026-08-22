# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

from flask_openapi3 import APIBlueprint, Tag

from app.auth.decorators import requer_papel
from app.blueprints import erro_json
from app.models.auth import PAPEL_ADMINISTRADOR, PAPEL_CONSULTOR
from app.schemas.comuns import respostas_erro
from app.schemas.ia import (
    AnaliseResultadosBody,
    AnaliseResultadosResponse,
    StatusAnaliseResultadosResponse,
)
from app.services import resultados_ia

tag = Tag(
    name="Análise de Resultados (IA)",
    description=(
        "Análise assistida de resultados, disponível para Consultor e "
        "Administrador logados, usando o provedor LLM configurado em "
        "/admin/configuracoes. Analisa exatamente a lista de dimensões já "
        "carregada na tela (mesmo formato de GET /admin/resultados ou "
        "GET /consultor/instituicoes/{id}/resultados-dashboard) — não "
        "refaz a consulta no backend, e nada é persistido."
    ),
)
bp = APIBlueprint(
    "resultados_ia", __name__, url_prefix="/ia/resultados", abp_tags=[tag], abp_security=[{"bearerAuth": []}]
)


@bp.get(
    "/status",
    summary="Disponibilidade da análise assistida de resultados",
    description="true quando o recurso está ativado e o provedor LLM está totalmente configurado — usado pelo frontend para decidir se mostra a aba 'Análise IA'.",
    responses={200: StatusAnaliseResultadosResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_CONSULTOR, PAPEL_ADMINISTRADOR)
def status_analise_resultados():
    return {"disponivel": resultados_ia.analise_disponivel()}


@bp.post(
    "/analise",
    summary="Gerar análise de resultados com IA",
    description=(
        "A partir de uma lista de dimensões (o mesmo recorte já filtrado/exibido na tela), "
        "a IA escreve uma análise em Markdown: pontos de atenção, padrões e sugestões gerais. "
        "Nada é persistido — cada chamada gera um texto novo."
    ),
    responses={200: AnaliseResultadosResponse, **respostas_erro(400, 401, 403, 502)},
)
@requer_papel(PAPEL_CONSULTOR, PAPEL_ADMINISTRADOR)
def gerar_analise_resultados(body: AnaliseResultadosBody):
    try:
        analise = resultados_ia.gerar_analise(body.resultados)
    except resultados_ia.AnaliseIndisponivelError as erro:
        return erro_json(erro.codigo, erro.mensagem, erro.status)
    return {"analise": analise}
