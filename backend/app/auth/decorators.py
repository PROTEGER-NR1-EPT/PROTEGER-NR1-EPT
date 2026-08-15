from datetime import datetime, timezone
from functools import wraps

from flask import g, jsonify, request

from app.extensions import db
from app.models.auth import SessaoLogin, Usuario


def _erro(codigo, mensagem, status):
    resposta = jsonify({"erro": codigo, "mensagem": mensagem, "detalhes": {}})
    resposta.status_code = status
    return resposta


def _carregar_usuario_da_requisicao():
    cabecalho = request.headers.get("Authorization", "")
    if not cabecalho.startswith("Bearer "):
        return None

    token = cabecalho[len("Bearer ") :].strip()
    if not token:
        return None

    sessao = db.session.query(SessaoLogin).filter_by(token=token).first()
    if sessao is None or sessao.revogado_em is not None:
        return None

    agora = datetime.now(timezone.utc)
    expira_em = sessao.expira_em
    if expira_em.tzinfo is None:
        expira_em = expira_em.replace(tzinfo=timezone.utc)
    if expira_em < agora:
        return None

    usuario = db.session.get(Usuario, sessao.usuario_id)
    if usuario is None or not usuario.ativo:
        return None

    return usuario


def login_required(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        usuario = _carregar_usuario_da_requisicao()
        if usuario is None:
            return _erro(
                "nao_autenticado", "Sessão inválida, expirada ou ausente.", 401
            )
        g.usuario = usuario
        return view_func(*args, **kwargs)

    return wrapper


def requer_papel(*papeis_permitidos):
    def decorador(view_func):
        @wraps(view_func)
        @login_required
        def wrapper(*args, **kwargs):
            if g.usuario.papel not in papeis_permitidos:
                return _erro(
                    "acesso_negado",
                    "Você não tem permissão para acessar este recurso.",
                    403,
                )
            return view_func(*args, **kwargs)

        return wrapper

    return decorador
