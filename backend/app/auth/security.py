# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import secrets

import bcrypt

# ---------------------------------------------------------------------------
# Escolha de autenticação: token opaco de sessão, persistido em
# sessao_login (banco auth) — não JWT, não Flask-Login.
# ---------------------------------------------------------------------------
# Motivos:
# 1. O modelo de dados já prevê uma tabela `sessao_login` com token, ip,
#    user_agent, criado_em/expira_em — desenhada para sessão server-side
#    revogável e auditável, não para um JWT autocontido.
# 2. Frontend (Vercel) e backend (Render) ficam em domínios diferentes;
#    sessão via cookie (Flask-Login) exige SameSite=None + Secure, o que
#    complica dev local em http. Um token opaco enviado como
#    `Authorization: Bearer <token>` evita esse problema por completo
#    para as chamadas normais à API. Um cookie httpOnly ainda existe,
#    mas só como mecanismo auxiliar de restauração de sessão após F5
#    (GET /auth/sessao, app/blueprints/auth.py) — nunca como o
#    transporte principal de autenticação, e a complicação de
#    SameSite/Secure entre ambientes é resolvida via COOKIE_SECURE/
#    COOKIE_SAMESITE em app/config.py (Lax+inseguro em dev, None+Secure
#    em produção).
# 3. Logout precisa invalidar a sessão imediatamente (revogado_em) — com
#    JWT stateless isso exigiria uma blocklist à parte, duplicando o que a
#    tabela sessao_login já faz.
#
# Hash de senha: bcrypt (via biblioteca `bcrypt`, sem Flask-Bcrypt) — mesmo
# nível de segurança do argon2 para este caso de uso, com wheels
# pré-compiladas mais amplamente disponíveis nos ambientes free-tier
# (Render) usados em produção.


def gerar_hash_senha(senha_texto_plano: str) -> str:
    hash_bytes = bcrypt.hashpw(senha_texto_plano.encode("utf-8"), bcrypt.gensalt())
    return hash_bytes.decode("utf-8")


def verificar_senha(senha_texto_plano: str, senha_hash: str) -> bool:
    try:
        return bcrypt.checkpw(
            senha_texto_plano.encode("utf-8"), senha_hash.encode("utf-8")
        )
    except ValueError:
        return False


def gerar_token_sessao() -> str:
    return secrets.token_urlsafe(48)
