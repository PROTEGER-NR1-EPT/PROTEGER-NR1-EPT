# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

from flask_openapi3 import APIBlueprint, Tag

from app.auth.decorators import requer_papel
from app.blueprints import erro_json
from app.models.auth import PAPEL_ADMINISTRADOR
from app.schemas.admin import CriarQuestionarioBody
from app.schemas.comuns import respostas_erro
from app.schemas.ia import StatusSugestaoQuestionarioResponse, SugestaoQuestionarioBody
from app.services import questionario_ia

tag = Tag(
    name="IA",
    description=(
        "Recursos de IA reservados ao Administrador, usando o provedor LLM "
        "configurado em /admin/configuracoes. Cada recurso é gateado pelo "
        "seu próprio toggle (ver ConfiguracaoSistema) — nunca confie apenas "
        "no frontend esconder o botão."
    ),
)
bp = APIBlueprint("ia", __name__, url_prefix="/admin/ia", abp_tags=[tag], abp_security=[{"bearerAuth": []}])


@bp.get(
    "/questionario/status",
    summary="Disponibilidade da criação assistida de questionário",
    description="true quando o recurso está ativado e o provedor LLM está totalmente configurado — usado pelo frontend para decidir se mostra o botão 'Gerar com IA'.",
    responses={200: StatusSugestaoQuestionarioResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def status_sugestao_questionario():
    return {"disponivel": questionario_ia.sugestao_disponivel()}


@bp.post(
    "/questionario/sugestao",
    summary="Gerar rascunho de questionário com IA",
    description=(
        "A partir de um pedido em texto livre, a IA gera um rascunho completo de "
        "questionário (domínios + itens), no mesmo formato aceito por "
        "POST /admin/questionarios. Nada é gravado no banco — o rascunho é só "
        "retornado para revisão do Administrador no formulário antes de salvar."
    ),
    responses={200: CriarQuestionarioBody, **respostas_erro(400, 401, 403, 502)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def gerar_sugestao_questionario(body: SugestaoQuestionarioBody):
    try:
        rascunho = questionario_ia.gerar_sugestao(body.pedido, body.instrumento_preferido)
    except questionario_ia.SugestaoIndisponivelError as erro:
        return erro_json(erro.codigo, erro.mensagem, erro.status)
    return rascunho.model_dump(exclude_none=True)
