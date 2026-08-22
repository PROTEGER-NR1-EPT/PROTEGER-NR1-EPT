# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

from flask import Response, g
from flask_openapi3 import APIBlueprint, Tag

from app.auth.decorators import requer_papel
from app.blueprints import erro_json
from app.models.auth import PAPEL_ADMINISTRADOR, PAPEL_CONSULTOR
from app.schemas.chat import (
    ConversaChatItem,
    ConversaIdPath,
    EnviarMensagemChatBody,
    FiltroMensagensChatQuery,
    ListaConversasChatResponse,
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
        "/admin/configuracoes. Cada usuário pode ter várias conversas "
        "distintas (/chat/conversas). Administrador também pode "
        "consultar/excluir/exportar as conversas de qualquer usuário "
        "(auditoria) — Consultor só as próprias."
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


# ---------------------------------------------------------------------------
# Conversas — cada uma com seu próprio fio de mensagens (MensagemChat.conversa_id)
# ---------------------------------------------------------------------------


@bp.post(
    "/conversas",
    summary="Criar nova conversa",
    description="Sempre para o próprio usuário autenticado — não existe criar conversa em nome de outro usuário.",
    responses={201: ConversaChatItem, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_CONSULTOR, PAPEL_ADMINISTRADOR)
def criar_conversa():
    return chat_ia.criar_conversa(g.usuario), 201


@bp.get(
    "/conversas",
    summary="Listar conversas do usuário",
    description=(
        "Só lista conversas com pelo menos 1 mensagem, mais recente primeiro. "
        "Administrador pode informar `usuario_id` para auditar outro usuário."
    ),
    responses={200: ListaConversasChatResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_CONSULTOR, PAPEL_ADMINISTRADOR)
def listar_conversas(query: FiltroMensagensChatQuery):
    try:
        return {"conversas": chat_ia.listar_conversas(g.usuario, query.usuario_id)}
    except chat_ia.ChatIndisponivelError as erro:
        return erro_json(erro.codigo, erro.mensagem, erro.status)


@bp.get(
    "/conversas/<int:conversa_id>/mensagens",
    summary="Mensagens de uma conversa",
    responses={200: ListaMensagensChatResponse, **respostas_erro(401, 403, 404)},
)
@requer_papel(PAPEL_CONSULTOR, PAPEL_ADMINISTRADOR)
def listar_mensagens_da_conversa(path: ConversaIdPath, query: FiltroMensagensChatQuery):
    try:
        return {
            "mensagens": chat_ia.listar_mensagens_conversa(
                g.usuario, path.conversa_id, query.usuario_id
            )
        }
    except chat_ia.ChatIndisponivelError as erro:
        return erro_json(erro.codigo, erro.mensagem, erro.status)


@bp.delete(
    "/conversas/<int:conversa_id>",
    summary="Excluir uma conversa",
    description="Exclusão definitiva — remove todas as mensagens dessa conversa. Ação registrada em log_atividade.",
    responses={200: ConfirmadoResponse, **respostas_erro(401, 403, 404)},
)
@requer_papel(PAPEL_CONSULTOR, PAPEL_ADMINISTRADOR)
def excluir_conversa(path: ConversaIdPath, query: FiltroMensagensChatQuery):
    try:
        chat_ia.excluir_conversa(g.usuario, path.conversa_id, query.usuario_id)
    except chat_ia.ChatIndisponivelError as erro:
        return erro_json(erro.codigo, erro.mensagem, erro.status)
    return {"confirmado": True}


@bp.get(
    "/conversas/<int:conversa_id>/export",
    summary="Exportar uma conversa (CSV)",
    description="Mesmas regras de acesso de GET /chat/conversas/{id}/mensagens. Ação registrada em log_atividade.",
    responses={200: {"content": {"text/csv": {"schema": {"type": "string"}}}}, **respostas_erro(401, 403, 404)},
)
@requer_papel(PAPEL_CONSULTOR, PAPEL_ADMINISTRADOR)
def exportar_conversa(path: ConversaIdPath, query: FiltroMensagensChatQuery):
    try:
        csv_texto, nome_arquivo = chat_ia.exportar_conversa_csv(
            g.usuario, path.conversa_id, query.usuario_id
        )
    except chat_ia.ChatIndisponivelError as erro:
        return erro_json(erro.codigo, erro.mensagem, erro.status)
    return Response(
        csv_texto,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={nome_arquivo}"},
    )


# ---------------------------------------------------------------------------
# Ações "todas as conversas de uma vez" (bulk)
# ---------------------------------------------------------------------------


@bp.get(
    "/mensagens",
    summary="Histórico completo do chat de ajuda (todas as conversas)",
    description=(
        "Todas as mensagens do usuário, de todas as conversas, em ordem "
        "cronológica. Sem `usuario_id`, devolve o histórico do próprio "
        "usuário autenticado. Administrador pode informar `usuario_id` "
        "para consultar o histórico de outro usuário — Consultor recebe "
        "403 se tentar."
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
    summary="Excluir todas as conversas do chat de ajuda",
    description="Exclui todas as conversas e mensagens do usuário (ou, se Administrador e `usuario_id` informado, de outro usuário). Ação registrada em log_atividade.",
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
    summary="Exportar todas as conversas do chat de ajuda (CSV)",
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
        "provedor de IA em /admin/configuracoes. Se `conversa_id` for "
        "omitido, continua (ou cria) a conversa mais recente do usuário — "
        "usado pelo widget flutuante, que não gerencia conversas "
        "explicitamente. Se `instituicao_id` for informado, a resposta "
        "considera os resultados agregados dessa instituição (já filtrados "
        "por k-anonimato) — Consultor só pode informar uma instituição à "
        "qual está vinculado."
    ),
    responses={200: MensagemChatResponse, **respostas_erro(400, 401, 403, 404, 502)},
)
@requer_papel(PAPEL_CONSULTOR, PAPEL_ADMINISTRADOR)
def enviar_mensagem(body: EnviarMensagemChatBody):
    try:
        return chat_ia.enviar_mensagem(
            g.usuario,
            body.mensagem,
            tela=body.tela,
            instituicao_id=body.instituicao_id,
            conversa_id=body.conversa_id,
        )
    except chat_ia.ChatIndisponivelError as erro:
        return erro_json(erro.codigo, erro.mensagem, erro.status)
