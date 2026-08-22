# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

from datetime import datetime, timedelta, timezone

from flask import current_app, g, jsonify, request
from flask_openapi3 import APIBlueprint, Tag

from app.auth.decorators import carregar_usuario_por_token, login_required
from app.auth.security import gerar_hash_senha, gerar_token_sessao, verificar_senha
from app.blueprints import erro_json
from app.extensions import db
from app.models.auth import SessaoLogin, Usuario
from app.schemas.auth import AlterarSenhaBody, LoginBody, LoginResponse, LogoutResponse
from app.schemas.comuns import ConfirmadoResponse, respostas_erro

tag = Tag(name="Autenticação", description="Login e logout de Consultor/Administrador.")
bp = APIBlueprint("auth", __name__, url_prefix="/auth", abp_tags=[tag])

# Nome do cookie httpOnly que guarda o mesmo token opaco de sessao_login,
# usado só para restaurar a sessão após F5 (GET /auth/sessao) — o path o
# restringe às rotas deste blueprint. Ver COOKIE_SECURE/COOKIE_SAMESITE em
# app/config.py para a lógica dev vs. produção.
COOKIE_NOME = "sessao_token"
COOKIE_PATH = "/api/v1/auth"


def _resumo_usuario(usuario):
    return {
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "papel": usuario.papel,
    }


def _definir_cookie_sessao(resposta, sessao):
    agora = datetime.now(timezone.utc)
    expira_em = sessao.expira_em
    if expira_em.tzinfo is None:
        expira_em = expira_em.replace(tzinfo=timezone.utc)
    resposta.set_cookie(
        COOKIE_NOME,
        sessao.token,
        max_age=int((expira_em - agora).total_seconds()),
        httponly=True,
        secure=current_app.config["COOKIE_SECURE"],
        samesite=current_app.config["COOKIE_SAMESITE"],
        path=COOKIE_PATH,
    )


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

    resposta = jsonify(
        {
            "token": sessao.token,
            "expira_em": sessao.expira_em.isoformat(),
            "usuario": _resumo_usuario(usuario),
        }
    )
    _definir_cookie_sessao(resposta, sessao)
    return resposta


@bp.get(
    "/sessao",
    summary="Restaurar sessão",
    description=(
        "Tenta restaurar a sessão a partir do cookie httpOnly definido no "
        "login. Usada pelo frontend ao carregar a página (F5 incluso) para "
        "reidratar o estado de autenticação em memória — o token de acesso "
        "em si nunca é lido de localStorage/sessionStorage (ver "
        "frontend/README.md). Não altera o cookie nem a sessão."
    ),
    responses={200: LoginResponse, **respostas_erro(401)},
)
def restaurar_sessao():
    token = request.cookies.get(COOKIE_NOME, "")
    usuario = carregar_usuario_por_token(token)
    if usuario is None:
        return erro_json("nao_autenticado", "Sessão inválida, expirada ou ausente.", 401)

    sessao = db.session.query(SessaoLogin).filter_by(token=token).first()
    return {
        "token": sessao.token,
        "expira_em": sessao.expira_em.isoformat(),
        "usuario": _resumo_usuario(usuario),
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

    resposta = jsonify({"confirmado": True})
    resposta.delete_cookie(COOKIE_NOME, path=COOKIE_PATH)
    return resposta


@bp.put(
    "/senha",
    summary="Alterar senha",
    description=(
        "Troca a senha do usuário autenticado (Consultor ou Administrador), "
        "exigindo a senha atual para confirmar a identidade. As sessões já "
        "abertas em outros dispositivos não são revogadas."
    ),
    security=[{"bearerAuth": []}],
    responses={200: ConfirmadoResponse, **respostas_erro(400, 401)},
)
@login_required
def alterar_senha(body: AlterarSenhaBody):
    if not verificar_senha(body.senha_atual, g.usuario.senha_hash):
        return erro_json("senha_atual_invalida", "Senha atual incorreta.", 400)

    g.usuario.senha_hash = gerar_hash_senha(body.senha_nova)
    db.session.commit()
    return {"confirmado": True}
