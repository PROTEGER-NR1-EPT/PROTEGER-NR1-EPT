# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado atual do repositório

Este repositório está em estágio de scaffolding: existe a configuração de ambiente de desenvolvimento (`.devcontainer/`) e os arquivos `backend/.env.example` e `frontend/.env.example`, mas ainda **não há código de aplicação** (`backend/` não tem `requirements.txt` nem arquivos `.py`; `frontend/` não tem `package.json` nem código-fonte). Não assuma a existência de comandos de build/lint/test até que esses arquivos sejam adicionados — quando forem, devem ser documentados aqui.

## Estrutura do monorepo

```
proteger-nr1-ept/
├── frontend/    → React (Vite), deploy em produção na Vercel
├── backend/     → Python (Flask + Gunicorn em produção), deploy no Render
├── docs/
└── README.md
```

## Ambiente de desenvolvimento (devcontainer)

O projeto usa Dev Containers do VS Code — "Reopen in Container" sobe tudo automaticamente:

- Imagem base `mcr.microsoft.com/devcontainers/base:ubuntu-22.04` com features Node LTS, Python 3.11, git e GitHub CLI (`.devcontainer/devcontainer.json`).
- `docker-compose.yml` sobe um serviço `db` (Postgres 16) além do container principal `app`.
- `postCreateCommand` executa `.devcontainer/post-create.sh`, que instala `backend/requirements.txt` (se existir), roda `npm install` em `frontend/` (se `package.json` existir) e copia `backend/.env.example`/`frontend/.env.example` para `.env` caso ainda não existam.
- Portas expostas: `5173` (Vite), `8000` (Flask dev server), `5432` (Postgres local).

## Arquitetura de dados: três bancos separados

A aplicação usa **três bancos Postgres logicamente separados** em vez de um único banco — o mesmo padrão é espelhado em dev (container local) e produção (Neon, um projeto por banco):

| Banco | Variável de ambiente | Propósito |
|---|---|---|
| `anonimo_db` | `DATABASE_URL_ANONIMO` | dados de denúncias/relatos anônimos |
| `auth_db` | `DATABASE_URL_AUTH` | autenticação/usuários |
| `memoria_db` | `DATABASE_URL_MEMORIA` | memória institucional |

Em dev local, os três bancos são criados automaticamente pelo `.devcontainer/init-db.sql` ao subir o container `db` (usuário `devuser`/`devpass`, apontando para `db:5432`). Ao alterar esse conjunto de bancos, atualize em conjunto: `init-db.sql`, `docker-compose.yml` e `backend/.env.example`.

## Variáveis de ambiente relevantes (`backend/.env.example`)

- `SECRET_KEY` — chave de sessão/assinatura Flask.
- `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` — usadas apenas para criar o primeiro Administrador no primeiro deploy.
- `K_ANONIMATO_THRESHOLD_DEFAULT` — limiar padrão de k-anonimato para proteção dos dados anônimos; configurável depois via painel do Administrador (não hardcoded após o bootstrap inicial).
- `LLM_ENABLED` / `LLM_PROVIDER` / `LLM_API_KEY` / `LLM_BASE_URL` — integração opcional de LLM (desativada por padrão), com suporte a múltiplos provedores via formato compatível com OpenAI: `anthropic`, `openai`, `gemini`, `openrouter`, `nvidia_build`.

`backend/.env` e `frontend/.env` nunca devem ser commitados (estão no `.gitignore`); use sempre os respectivos `.env.example` como referência ao adicionar novas variáveis.

## Deploy em produção

- **Frontend**: Vercel (build Vite estático).
- **Backend**: Render, servido via Gunicorn (não o servidor de dev do Flask).
- **Bancos**: Neon Postgres — um projeto Neon por banco (`anonimo_db`, `auth_db`, `memoria_db`), refletindo a separação usada em dev.
