from flask import g
from flask_openapi3 import APIBlueprint, Tag

from app.auth.decorators import requer_papel
from app.blueprints import erro_json
from app.extensions import db
from app.models.anonimo import Instituicao
from app.models.auth import LogAtividade, PAPEL_ADMINISTRADOR
from app.models.memoria import STATUS_ACAO_VALIDOS, AcaoPlano, PlanoAcao, TarefaAcao
from app.schemas.comuns import ConfirmadoResponse, IdCriadoResponse, respostas_erro
from app.schemas.planos_acao import (
    AcaoIdPath,
    CriarAcaoBody,
    CriarPlanoBody,
    EditarAcaoBody,
    EditarTarefaBody,
    ListaAcoesResponse,
    ListaPlanosResponse,
    PlanoIdPath,
    TarefaIdPath,
)
from app.schemas.publico import InstituicaoIdPath
import app.services.planos_acao as servico

tag = Tag(
    name="Planos de Ação",
    description=(
        "Planos de ação por instituição/ciclo (banco memória) — ações com "
        "status, prazo, tarefas (checklist) e dependências entre si. "
        "Restrito ao papel 'administrador' (mesmo escopo de acesso da "
        "memória institucional hoje)."
    ),
)
bp = APIBlueprint(
    "planos_acao", __name__, url_prefix="/admin", abp_tags=[tag], abp_security=[{"bearerAuth": []}]
)


def _registrar_log(acao, entidade=None, entidade_id=None, detalhes=None):
    db.session.add(
        LogAtividade(
            usuario_id=g.usuario.id,
            acao=acao,
            entidade=entidade,
            entidade_id=entidade_id,
            detalhes=detalhes,
        )
    )


def _validar_status(status):
    if status is not None and status not in STATUS_ACAO_VALIDOS:
        return erro_json(
            "status_invalido", f"status deve ser um de: {STATUS_ACAO_VALIDOS}.", 400
        )
    return None


def _validar_depende_de_ids(depende_de_ids, plano_id, acao_id=None):
    if not depende_de_ids:
        return None
    if acao_id is not None and acao_id in depende_de_ids:
        return erro_json(
            "dependencia_invalida", "Uma ação não pode depender de si mesma.", 400
        )
    ids_validos = {
        a.id
        for a in db.session.query(AcaoPlano.id)
        .filter(AcaoPlano.plano_id == plano_id, AcaoPlano.id.in_(depende_de_ids))
        .all()
    }
    invalidos = set(depende_de_ids) - ids_validos
    if invalidos:
        return erro_json(
            "dependencia_invalida",
            "Algumas ações informadas em depende_de_ids não existem neste plano.",
            400,
            {"ids_invalidos": sorted(invalidos)},
        )
    return None


# ---------------------------------------------------------------------------
# Planos (ciclos)
# ---------------------------------------------------------------------------


@bp.get(
    "/instituicoes/<int:instituicao_id>/planos-acao",
    summary="Listar planos de ação de uma instituição",
    description="Mais recentes primeiro, com contagem de ações/concluídas por plano.",
    responses={200: ListaPlanosResponse, **respostas_erro(401, 403, 404)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def listar_planos(path: InstituicaoIdPath):
    instituicao = db.session.get(Instituicao, path.instituicao_id)
    if instituicao is None:
        return erro_json("nao_encontrado", "Instituição não encontrada.", 404)
    return servico.listar_planos(path.instituicao_id)


@bp.post(
    "/instituicoes/<int:instituicao_id>/planos-acao",
    summary="Criar plano de ação (novo ciclo)",
    responses={201: IdCriadoResponse, **respostas_erro(400, 401, 403, 404)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def criar_plano(path: InstituicaoIdPath, body: CriarPlanoBody):
    instituicao = db.session.get(Instituicao, path.instituicao_id)
    if instituicao is None:
        return erro_json("nao_encontrado", "Instituição não encontrada.", 404)

    ciclo = body.ciclo.strip()
    if not ciclo:
        return erro_json("payload_invalido", "O campo 'ciclo' é obrigatório.", 400)

    plano = servico.criar_plano(path.instituicao_id, ciclo, g.usuario.id)
    _registrar_log("criar_plano_acao", "plano_acao", plano.id)
    db.session.commit()
    return {"id": plano.id}, 201


# ---------------------------------------------------------------------------
# Ações
# ---------------------------------------------------------------------------


@bp.get(
    "/planos-acao/<int:plano_id>/acoes",
    summary="Listar ações de um plano",
    description="Cada ação já vem com tarefas, depende_de e bloqueia (calculado por inversão) resolvidos.",
    responses={200: ListaAcoesResponse, **respostas_erro(401, 403, 404)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def listar_acoes(path: PlanoIdPath):
    plano = db.session.get(PlanoAcao, path.plano_id)
    if plano is None:
        return erro_json("nao_encontrado", "Plano de ação não encontrado.", 404)
    return servico.listar_acoes(path.plano_id)


@bp.post(
    "/planos-acao/<int:plano_id>/acoes",
    summary="Criar ação",
    responses={201: IdCriadoResponse, **respostas_erro(400, 401, 403, 404)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def criar_acao(path: PlanoIdPath, body: CriarAcaoBody):
    plano = db.session.get(PlanoAcao, path.plano_id)
    if plano is None:
        return erro_json("nao_encontrado", "Plano de ação não encontrado.", 404)

    titulo = body.titulo.strip()
    if not titulo:
        return erro_json("payload_invalido", "O campo 'titulo' é obrigatório.", 400)

    erro = _validar_status(body.status)
    if erro is not None:
        return erro
    erro = _validar_depende_de_ids(body.depende_de_ids, path.plano_id)
    if erro is not None:
        return erro

    dados = body.model_dump(exclude_none=True)
    dados["titulo"] = titulo

    acao = servico.criar_acao(path.plano_id, dados)
    _registrar_log("criar_acao_plano", "acao_plano", acao.id)
    db.session.commit()
    return {"id": acao.id}, 201


@bp.put(
    "/acoes/<int:acao_id>",
    summary="Editar ação",
    description=(
        "Só altera os campos enviados no payload. Se `tarefas` ou "
        "`depende_de_ids` forem enviados, SUBSTITUEM completamente a lista "
        "atual — não é merge parcial. Também é a rota usada pelo "
        "drag&drop do Kanban (envie `status`/`ordem`)."
    ),
    responses={200: ConfirmadoResponse, **respostas_erro(400, 401, 403, 404)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def editar_acao(path: AcaoIdPath, body: EditarAcaoBody):
    acao = db.session.get(AcaoPlano, path.acao_id)
    if acao is None:
        return erro_json("nao_encontrado", "Ação não encontrada.", 404)

    dados = body.model_dump(exclude_unset=True)

    erro = _validar_status(dados.get("status"))
    if erro is not None:
        return erro
    if "depende_de_ids" in dados:
        erro = _validar_depende_de_ids(dados["depende_de_ids"], acao.plano_id, acao_id=acao.id)
        if erro is not None:
            return erro

    if "titulo" in dados:
        dados["titulo"] = dados["titulo"].strip()

    servico.editar_acao(acao, dados)
    _registrar_log("editar_acao_plano", "acao_plano", acao.id, dados)
    db.session.commit()
    return {"confirmado": True}


@bp.delete(
    "/acoes/<int:acao_id>",
    summary="Excluir ação",
    description="Exclusão definitiva — remove tarefas e dependências (nas duas direções) em cascata.",
    responses={200: ConfirmadoResponse, **respostas_erro(401, 403, 404)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def excluir_acao(path: AcaoIdPath):
    acao = db.session.get(AcaoPlano, path.acao_id)
    if acao is None:
        return erro_json("nao_encontrado", "Ação não encontrada.", 404)

    _registrar_log("excluir_acao_plano", "acao_plano", acao.id)
    servico.excluir_acao(acao)
    db.session.commit()
    return {"confirmado": True}


@bp.put(
    "/tarefas/<int:tarefa_id>",
    summary="Marcar/desmarcar uma tarefa",
    description="Toggle rápido de uma tarefa do checklist, sem reenviar a lista inteira.",
    responses={200: ConfirmadoResponse, **respostas_erro(401, 403, 404)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def editar_tarefa(path: TarefaIdPath, body: EditarTarefaBody):
    tarefa = db.session.get(TarefaAcao, path.tarefa_id)
    if tarefa is None:
        return erro_json("nao_encontrado", "Tarefa não encontrada.", 404)

    servico.editar_tarefa(tarefa, body.concluida)
    return {"confirmado": True}


# ---------------------------------------------------------------------------
# Geração automática de sugestões
# ---------------------------------------------------------------------------


@bp.post(
    "/planos-acao/<int:plano_id>/gerar-sugestoes",
    summary="Gerar sugestões de ação a partir do diagnóstico",
    description=(
        "Regra determinística (sem LLM): cria uma ação-rascunho por "
        "dimensão em nível de risco alto/crítico no dashboard de "
        "Resultados da instituição do plano, pulando dimensões que já têm "
        "uma ação com a mesma tag. Devolve as ações criadas para revisão."
    ),
    responses={200: ListaAcoesResponse, **respostas_erro(401, 403, 404)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def gerar_sugestoes(path: PlanoIdPath):
    plano = db.session.get(PlanoAcao, path.plano_id)
    if plano is None:
        return erro_json("nao_encontrado", "Plano de ação não encontrado.", 404)

    criadas = servico.gerar_sugestoes(plano)
    if criadas:
        _registrar_log(
            "gerar_sugestoes_plano_acao",
            "plano_acao",
            plano.id,
            {"quantidade": len(criadas)},
        )
        db.session.commit()
    return criadas
