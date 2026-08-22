# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

from flask import g
from flask_openapi3 import APIBlueprint, Tag

from app.auth.decorators import requer_papel
from app.blueprints import erro_json
from app.extensions import db
from app.models.anonimo import Instituicao
from app.models.auth import PAPEL_CONSULTOR, ConsultorInstituicao
from app.models.memoria import PlanoAcao, RegistroMemoria
from app.schemas.admin import ListaResultadosDimensaoResponse
from app.schemas.comuns import respostas_erro
from app.schemas.consultor import ListaMemoriaResponse, ListaResultadosResponse
from app.schemas.planos_acao import ListaAcoesResponse, ListaPlanosResponse, PlanoIdPath
from app.schemas.publico import InstituicaoIdPath, ListaInstituicoesPublicasResponse
from app.services.k_anonimato import obter_resultados
from app.services.resultados_dashboard import obter_resultados_dashboard
import app.services.planos_acao as servico_planos_acao

tag = Tag(
    name="Consultor",
    description=(
        "Rotas restritas ao papel 'consultor', autenticadas via "
        "`Authorization: Bearer <token>`. Um Consultor só enxerga dados das "
        "instituições às quais está explicitamente vinculado "
        "(`consultor_instituicao`, banco auth) — ver "
        "POST /admin/usuarios/{id}/vinculos."
    ),
)
bp = APIBlueprint(
    "consultor", __name__, url_prefix="/consultor", abp_tags=[tag], abp_security=[{"bearerAuth": []}]
)


def _instituicoes_vinculadas(usuario_id: int) -> set[int]:
    vinculos = (
        db.session.query(ConsultorInstituicao)
        .filter_by(usuario_id=usuario_id)
        .all()
    )
    return {v.instituicao_id for v in vinculos}


@bp.get(
    "/instituicoes",
    summary="Listar minhas instituições",
    description="Instituições às quais o Consultor autenticado está vinculado.",
    responses={200: ListaInstituicoesPublicasResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_CONSULTOR)
def listar_minhas_instituicoes():
    ids = _instituicoes_vinculadas(g.usuario.id)
    if not ids:
        return []

    # Nunca uma FK real entre bancos: a lista de instituições vinculadas
    # (banco auth) é resolvida por uma segunda consulta ao banco anônimo
    # (docs/03).
    instituicoes = (
        db.session.query(Instituicao).filter(Instituicao.id.in_(ids)).all()
    )
    return [
        {"id": i.id, "nome": i.nome, "uf": i.uf, "municipio": i.municipio}
        for i in instituicoes
    ]


@bp.get(
    "/instituicoes/<int:instituicao_id>/resultados",
    summary="Resultados agregados de uma instituição vinculada",
    description=(
        "Retorna os resultados agregados (por domínio, já filtrados por "
        "k-anonimato) da instituição, desde que o Consultor esteja "
        "vinculado a ela — 403 caso contrário."
    ),
    responses={200: ListaResultadosResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_CONSULTOR)
def resultados_da_instituicao(path: InstituicaoIdPath):
    if path.instituicao_id not in _instituicoes_vinculadas(g.usuario.id):
        return erro_json(
            "acesso_negado", "Você não está vinculado a esta instituição.", 403
        )
    return obter_resultados(path.instituicao_id)


@bp.get(
    "/instituicoes/<int:instituicao_id>/resultados-dashboard",
    summary="Dashboard de resultados (cards, radar e mapa de risco) de uma instituição vinculada",
    description=(
        "Mesmo formato usado pelo dashboard multi-filtro do Administrador "
        "(GET /admin/resultados) — inclui `risco`/`nivel_risco`, necessários "
        "para os cards de KPI, o radar 'Visão geral' e o 'Mapa de risco' — "
        "mas já escopado a uma única instituição vinculada, sem parâmetros "
        "de filtro adicionais."
    ),
    responses={200: ListaResultadosDimensaoResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_CONSULTOR)
def resultados_dashboard_da_instituicao(path: InstituicaoIdPath):
    if path.instituicao_id not in _instituicoes_vinculadas(g.usuario.id):
        return erro_json(
            "acesso_negado", "Você não está vinculado a esta instituição.", 403
        )
    return obter_resultados_dashboard(instituicao_ids=[path.instituicao_id])


@bp.get(
    "/instituicoes/<int:instituicao_id>/memoria",
    summary="Memória institucional de uma instituição vinculada",
    description="Registros de memória institucional (banco memória), desde que o Consultor esteja vinculado à instituição.",
    responses={200: ListaMemoriaResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_CONSULTOR)
def memoria_da_instituicao(path: InstituicaoIdPath):
    if path.instituicao_id not in _instituicoes_vinculadas(g.usuario.id):
        return erro_json(
            "acesso_negado", "Você não está vinculado a esta instituição.", 403
        )
    registros = (
        db.session.query(RegistroMemoria)
        .filter_by(instituicao_id=path.instituicao_id)
        .order_by(RegistroMemoria.criado_em.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "tipo": r.tipo,
            "titulo": r.titulo,
            "descricao": r.descricao,
            "anexo_url": r.anexo_url,
            "criado_em": r.criado_em.isoformat(),
        }
        for r in registros
    ]


# ---------------------------------------------------------------------------
# Planos de Ação — somente leitura: o Consultor pode consultar os planos e
# ações das instituições vinculadas (Kanban/Tabela/Calendário no frontend),
# mas não criar/editar/excluir nada — isso continua restrito ao
# Administrador (app/blueprints/planos_acao.py). Reaproveita o mesmo
# app/services/planos_acao.py, sem nenhuma regra de negócio duplicada.
# ---------------------------------------------------------------------------


@bp.get(
    "/instituicoes/<int:instituicao_id>/planos-acao",
    summary="Listar planos de ação de uma instituição vinculada (somente leitura)",
    description="Mais recentes primeiro, com contagem de ações/concluídas por plano — 403 se o Consultor não estiver vinculado à instituição.",
    responses={200: ListaPlanosResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_CONSULTOR)
def planos_acao_da_instituicao(path: InstituicaoIdPath):
    if path.instituicao_id not in _instituicoes_vinculadas(g.usuario.id):
        return erro_json(
            "acesso_negado", "Você não está vinculado a esta instituição.", 403
        )
    return servico_planos_acao.listar_planos(path.instituicao_id)


@bp.get(
    "/planos-acao/<int:plano_id>/acoes",
    summary="Listar ações de um plano de uma instituição vinculada (somente leitura)",
    description="Cada ação já vem com tarefas, depende_de e bloqueia (calculado por inversão) resolvidos.",
    responses={200: ListaAcoesResponse, **respostas_erro(401, 403, 404)},
)
@requer_papel(PAPEL_CONSULTOR)
def acoes_do_plano(path: PlanoIdPath):
    plano = db.session.get(PlanoAcao, path.plano_id)
    if plano is None:
        return erro_json("nao_encontrado", "Plano de ação não encontrado.", 404)
    if plano.instituicao_id not in _instituicoes_vinculadas(g.usuario.id):
        return erro_json(
            "acesso_negado", "Você não está vinculado a esta instituição.", 403
        )
    return servico_planos_acao.listar_acoes(plano.id)
