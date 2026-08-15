from datetime import datetime, timedelta, timezone

from flask import current_app, request
from flask_openapi3 import APIBlueprint, Tag

from app.auth.decorators import login_required
from app.auth.security import gerar_token_sessao, verificar_senha
from app.blueprints import erro_json
from app.extensions import db
from app.models.auth import SessaoLogin, Usuario
from app.schemas.auth import LoginBody, LoginResponse, LogoutResponse
from app.schemas.comuns import respostas_erro

tag = Tag(name="Autenticação", description="Login e logout de Consultor/Administrador.")
bp = APIBlueprint("auth", __name__, url_prefix="/auth", abp_tags=[tag])


@bp.post(
    "/login",
    summary="Login",
    description=(
        "Autentica um Consultor ou Administrador e cria uma sessão "
        "(`sessao_login`), retornando um token opaco de sessão — não um "
        "JWT (ver app/auth/security.py). Envie esse token nas próximas "
        "requisições como `Authorization: Bearer <token>`. Clique em "
        "**Authorize** no topo desta página para configurar o token e "
        "testar as rotas protegidas diretamente aqui."
    ),
    responses={200: LoginResponse, **respostas_erro(400, 401)},
)
def login(body: LoginBody):
    email = body.email.strip().lower()
    senha = body.senha

    usuario = db.session.query(Usuario).filter_by(email=email).first()
    if usuario is None or not usuario.ativo or not verificar_senha(senha, usuario.senha_hash):
        return erro_json("credenciais_invalidas", "E-mail ou senha inválidos.", 401)

    agora = datetime.now(timezone.utc)
    sessao = SessaoLogin(
        usuario_id=usuario.id,
        token=gerar_token_sessao(),
        criado_em=agora,
        expira_em=agora + timedelta(hours=current_app.config["SESSAO_LOGIN_TTL_HORAS"]),
        ip=request.remote_addr,
        user_agent=(request.headers.get("User-Agent") or "")[:255],
    )
    db.session.add(sessao)
    db.session.commit()

    return {
        "token": sessao.token,
        "expira_em": sessao.expira_em.isoformat(),
        "usuario": {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email,
            "papel": usuario.papel,
        },
    }


@bp.post(
    "/logout",
    summary="Logout",
    description="Revoga a sessão atual (`sessao_login.revogado_em`) — o token deixa de ser aceito imediatamente.",
    security=[{"bearerAuth": []}],
    responses={200: LogoutResponse, **respostas_erro(401)},
)
@login_required
def logout():
    token = request.headers.get("Authorization", "")[len("Bearer ") :].strip()
    sessao = db.session.query(SessaoLogin).filter_by(token=token).first()
    if sessao is not None and sessao.revogado_em is None:
        sessao.revogado_em = datetime.now(timezone.utc)
        db.session.commit()
    return {"confirmado": True}
