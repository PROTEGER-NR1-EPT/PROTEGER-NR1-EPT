# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

from flask import Response, g
from flask_openapi3 import APIBlueprint, Tag

from app.auth.decorators import requer_papel
from app.blueprints import erro_json
from app.models.auth import PAPEL_ADMINISTRADOR, PAPEL_CONSULTOR
from app.schemas.chat import (
    EnviarMensagemChatBody,
    FiltroMensagensChatQuery,
    ListaMensagensChatResponse,
    MensagemChatResponse,
    StatusChatResponse,
)
from app.schemas.comuns import ConfirmadoResponse, respostas_erro
from app.services import chat_ia

tag = Tag(
    name="Chat",
    description=(
        "Chat de ajuda contextual, disponível para Consultor e "
        "Administrador logados, usando o provedor LLM configurado em "
        "/admin/configuracoes. Administrador também pode consultar/"
        "excluir/exportar o histórico de qualquer usuário (auditoria) — "
        "Consultor só o próprio."
    ),
)
bp = APIBlueprint("chat", __name__, url_prefix="/chat", abp_tags=[tag], abp_security=[{"bearerAuth": []}])


@bp.get(
    "/status",
    summary="Disponibilidade do chat de ajuda",
    description="true quando o chat está ativado e o provedor LLM está totalmente configurado — usado pelo frontend para decidir se mostra o widget/menu.",
    responses={200: StatusChatResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_CONSULTOR, PAPEL_ADMINISTRADOR)
def obter_status():
    return {"disponivel": chat_ia.chat_disponivel()}


@bp.get(
    "/mensagens",
    summary="Histórico do chat de ajuda",
    description=(
        "Últimas mensagens do chat de ajuda, em ordem cronológica. Sem "
        "`usuario_id`, devolve o histórico do próprio usuário autenticado. "
        "Administrador pode informar `usuario_id` para consultar o "
        "histórico de outro usuário — Consultor recebe 403 se tentar."
    ),
    responses={200: ListaMensagensChatResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_CONSULTOR, PAPEL_ADMINISTRADOR)
def listar_mensagens(query: FiltroMensagensChatQuery):
    try:
        return {"mensagens": chat_ia.listar_historico(g.usuario, query.usuario_id)}
    except chat_ia.ChatIndisponivelError as erro:
        return erro_json(erro.codigo, erro.mensagem, erro.status)


@bp.delete(
    "/mensagens",
    summary="Excluir histórico do chat de ajuda",
    description="Exclui todas as mensagens do usuário (ou, se Administrador e `usuario_id` informado, de outro usuário). Ação registrada em log_atividade.",
    responses={200: ConfirmadoResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_CONSULTOR, PAPEL_ADMINISTRADOR)
def excluir_mensagens(query: FiltroMensagensChatQuery):
    try:
        chat_ia.excluir_historico(g.usuario, query.usuario_id)
    except chat_ia.ChatIndisponivelError as erro:
        return erro_json(erro.codigo, erro.mensagem, erro.status)
    return {"confirmado": True}


@bp.get(
    "/mensagens/export",
    summary="Exportar histórico do chat de ajuda (CSV)",
    description="Mesmas regras de acesso de GET /chat/mensagens. Ação registrada em log_atividade.",
    responses={200: {"content": {"text/csv": {"schema": {"type": "string"}}}}, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_CONSULTOR, PAPEL_ADMINISTRADOR)
def exportar_mensagens(query: FiltroMensagensChatQuery):
    try:
        csv_texto, nome_arquivo = chat_ia.exportar_historico_csv(g.usuario, query.usuario_id)
    except chat_ia.ChatIndisponivelError as erro:
        return erro_json(erro.codigo, erro.mensagem, erro.status)
    return Response(
        csv_texto,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={nome_arquivo}"},
    )


@bp.post(
    "/mensagens",
    summary="Enviar mensagem ao chat de ajuda",
    description=(
        "Envia uma mensagem ao assistente de ajuda e devolve a resposta. "
        "Requer que o Administrador tenha ativado o chat e configurado um "
        "provedor de IA em /admin/configuracoes. Se `instituicao_id` for "
        "informado, a resposta considera os resultados agregados dessa "
        "instituição (já filtrados por k-anonimato) — Consultor só pode "
        "informar uma instituição à qual está vinculado."
    ),
    responses={200: MensagemChatResponse, **respostas_erro(400, 401, 403, 502)},
)
@requer_papel(PAPEL_CONSULTOR, PAPEL_ADMINISTRADOR)
def enviar_mensagem(body: EnviarMensagemChatBody):
    try:
        return chat_ia.enviar_mensagem(
            g.usuario, body.mensagem, tela=body.tela, instituicao_id=body.instituicao_id
        )
    except chat_ia.ChatIndisponivelError as erro:
        return erro_json(erro.codigo, erro.mensagem, erro.status)
