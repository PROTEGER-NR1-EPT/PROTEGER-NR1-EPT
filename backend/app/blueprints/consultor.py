from flask import g
from flask_openapi3 import APIBlueprint, Tag

from app.auth.decorators import requer_papel
from app.blueprints import erro_json
from app.extensions import db
from app.models.anonimo import Instituicao
from app.models.auth import PAPEL_CONSULTOR, ConsultorInstituicao
from app.models.memoria import RegistroMemoria
from app.schemas.comuns import respostas_erro
from app.schemas.consultor import ListaMemoriaResponse, ListaResultadosResponse
from app.schemas.publico import InstituicaoIdPath, ListaInstituicoesPublicasResponse
from app.services.k_anonimato import obter_resultados

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
