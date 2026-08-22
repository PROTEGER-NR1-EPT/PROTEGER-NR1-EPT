# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import os


def _bool_env(nome, padrao=False):
    valor = os.environ.get(nome)
    if valor is None:
        return padrao
    return valor.strip().lower() in ("1", "true", "yes", "on")


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "troque-esta-chave-em-producao")

    SQLALCHEMY_DATABASE_URI_ANONIMO = os.environ.get("DATABASE_URL_ANONIMO")
    SQLALCHEMY_DATABASE_URI_AUTH = os.environ.get("DATABASE_URL_AUTH")
    SQLALCHEMY_DATABASE_URI_MEMORIA = os.environ.get("DATABASE_URL_MEMORIA")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    ADMIN_BOOTSTRAP_EMAIL = os.environ.get("ADMIN_BOOTSTRAP_EMAIL")
    ADMIN_BOOTSTRAP_PASSWORD = os.environ.get("ADMIN_BOOTSTRAP_PASSWORD")

    # Valor de fábrica usado apenas para popular a linha inicial da tabela
    # de configuração (ver services/k_anonimato.py) — depois de criada, o
    # valor efetivo do threshold vem sempre do banco, nunca deste env var.
    K_ANONIMATO_THRESHOLD_DEFAULT = int(
        os.environ.get("K_ANONIMATO_THRESHOLD_DEFAULT", "5")
    )

    # Estes campos de LLM só alimentam a linha inicial de configuração
    # (mesma lógica do threshold acima): o estado efetivo dos toggles de IA
    # é sempre lido do banco (tabela configuracoes_sistema), nunca do env,
    # para que o Administrador possa ligar/desligar em runtime.
    LLM_ENABLED_DEFAULT = _bool_env("LLM_ENABLED", False)
    LLM_PROVIDER_DEFAULT = os.environ.get("LLM_PROVIDER") or None
    LLM_API_KEY_DEFAULT = os.environ.get("LLM_API_KEY") or None
    LLM_BASE_URL_DEFAULT = os.environ.get("LLM_BASE_URL") or None
    LLM_MODEL_DEFAULT = os.environ.get("LLM_MODEL") or None

    CORS_ORIGINS = [
        origem.strip()
        for origem in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origem.strip()
    ]

    SESSAO_LOGIN_TTL_HORAS = int(os.environ.get("SESSAO_LOGIN_TTL_HORAS", "24"))

    FLASK_ENV = os.environ.get("FLASK_ENV", "production")
    DEBUG = _bool_env("FLASK_DEBUG", False)

    # Cookie httpOnly usado só para restaurar a sessão após F5
    # (POST /auth/login o define; GET /auth/sessao o lê) — o token de
    # acesso em si continua trafegando via Authorization: Bearer e vivendo
    # só em memória no frontend, nunca em localStorage/sessionStorage (ver
    # frontend/README.md e app/auth/security.py).
    #
    # Produção: frontend (Vercel) e backend (Render) ficam em domínios
    # diferentes → cookie cross-site precisa de SameSite=None + Secure
    # (exige HTTPS, que ambos têm em produção).
    # Dev local: frontend (:5173) e backend (:8000) são portas diferentes
    # do mesmo host "localhost" — mesmo "site" pela definição de SameSite
    # (que ignora porta), então Lax + Secure=False funciona sem HTTPS.
    COOKIE_SECURE = not DEBUG
    COOKIE_SAMESITE = "Lax" if DEBUG else "None"
