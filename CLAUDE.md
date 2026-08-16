# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado atual do repositório

O **backend** (`backend/`) está implementado: aplicação Flask completa (application
factory, 3 bancos via SQLAlchemy binds, autenticação por token de sessão,
CRUD administrativo, cálculo de Karasek/COPSOQ, k-anonimato, exportação
CSV com log de auditoria, documentação OpenAPI/Scalar), com testes
unitários e migrations já geradas. Ver `backend/README.md` para a
estrutura completa de pastas e decisões de arquitetura, e a seção
"Backend — comandos" abaixo para rodar localmente.

O **frontend** (`frontend/`) também está implementado: React + Vite,
React Router, Context API (sem Redux), cliente axios em `src/api/`
consumindo a API do backend, CSS Modules (+ Tailwind v4 para páginas
novas), um widget de acessibilidade flutuante (fonte/contraste) e todas
as telas públicas — incluindo a página institucional de apresentação em
`/`, separada do fluxo de resposta que começa em `/participar` — além de
Consultor e Administrador do MVP. Ver `frontend/README.md` para estrutura
completa e decisões (inclusive por que o token de sessão vive só em
memória, nunca em localStorage/sessionStorage), e a seção "Frontend —
comandos" abaixo.

## Backend — comandos

Dentro do devcontainer, os 3 bancos locais já sobem via `docker-compose` e
`backend/.env` já existe (copiado do `.env.example`).

```bash
cd backend
pip install -r requirements.txt

export FLASK_APP=wsgi.py
flask db upgrade          # aplica as migrations nos 3 bancos (Flask-Migrate --multidb)
flask bootstrap-admin     # cria o 1º Administrador a partir de ADMIN_BOOTSTRAP_EMAIL/PASSWORD (idempotente)
flask seed-dev-data       # opcional: massa de dados fictícia p/ testar o sistema (idempotente, só em FLASK_ENV=development)

python run.py             # servidor de desenvolvimento em http://localhost:8000
pytest                    # testes: k-anonimato, Karasek, COPSOQ (app/services/)
```

Com o servidor rodando, a documentação interativa da API (Scalar) fica em
`http://localhost:8000/docs/scalar` (spec OpenAPI em `/docs/openapi.json`).

## Frontend — comandos

Precisa do backend rodando (seção acima) — `VITE_API_BASE_URL`, em
`frontend/.env`, aponta para a raiz dele (o prefixo `/api/v1` é
adicionado em `src/api/client.js`).

```bash
cd frontend
npm install

npm run dev      # servidor de desenvolvimento em http://localhost:5173
npm run build    # build de produção em dist/
npm run lint     # ESLint (react, react-hooks, jsx-a11y)
npm test         # testes de integração contra a API real (backend precisa estar no ar)
```

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
- `frontend/node_modules` vive num **volume Docker nomeado** (`frontend-node-modules`), não no bind mount de `..:/workspace` — em dev no WSL2 com o repositório no disco Windows, `/workspace` é acessado via 9p, muito mais lento que o storage nativo do Docker para diretórios com muitos arquivos pequenos (medido: `npm run lint` caiu de ~26s para poucos segundos com esse volume). Efeito colateral: `node_modules` não aparece fora do container (Explorer do Windows, `git`, etc.) — não é um problema, já está no `.gitignore`. Alterar dependências do frontend continua normal (`npm install`/`npm ci` dentro do container); só uma mudança na própria configuração do volume exige "Rebuild Container".

## Arquitetura de dados: três bancos separados

A aplicação usa **três bancos Postgres logicamente separados** em vez de um único banco — o mesmo padrão é espelhado em dev (container local) e produção (Neon, um projeto por banco):

| Banco | Variável de ambiente | Propósito |
|---|---|---|
| `anonimo_db` | `DATABASE_URL_ANONIMO` | instituições, setores, questionários/domínios/itens, respostas brutas (sem identificador de pessoa) e resultados agregados (k-anonimato) |
| `auth_db` | `DATABASE_URL_AUTH` | usuários (Consultor/Administrador), vínculos consultor-instituição, sessões de login, log de atividade |
| `memoria_db` | `DATABASE_URL_MEMORIA` | memória institucional (registros históricos, linha do tempo) |

Em dev local, os três bancos são criados automaticamente pelo `.devcontainer/init-db.sql` ao subir o container `db` (usuário `devuser`/`devpass`, apontando para `db:5432`). Ao alterar esse conjunto de bancos, atualize em conjunto: `init-db.sql`, `docker-compose.yml` e `backend/.env.example`.

No código do backend, os três bancos são acessados por uma única instância
`SQLAlchemy` com `SQLALCHEMY_BINDS` (uma engine/pool de conexão física
separada por bind key), não três instâncias de `SQLAlchemy` — Flask-SQLAlchemy
3.x não permite registrar uma segunda instância no mesmo app. Ver comentário
completo em `backend/app/extensions.py`.

## Variáveis de ambiente relevantes (`backend/.env.example`)

- `SECRET_KEY` — chave de sessão/assinatura Flask.
- `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` — usadas apenas para criar o primeiro Administrador no primeiro deploy.
- `K_ANONIMATO_THRESHOLD_DEFAULT` — limiar padrão de k-anonimato para proteção dos dados anônimos; configurável depois via painel do Administrador (não hardcoded após o bootstrap inicial).
- `LLM_ENABLED` / `LLM_PROVIDER` / `LLM_API_KEY` / `LLM_BASE_URL` — integração opcional de LLM (desativada por padrão), com suporte a múltiplos provedores via formato compatível com OpenAI: `anthropic`, `openai`, `gemini`, `openrouter`, `nvidia_build`. Só alimentam a linha inicial de `configuracoes_sistema` (banco anônimo) — o valor efetivo em runtime é sempre lido do banco, ajustável via `/admin/configuracoes`.
- `CORS_ORIGINS` — origens permitidas pelo flask-cors (separadas por vírgula), padrão `http://localhost:5173`.

`backend/.env` e `frontend/.env` nunca devem ser commitados (estão no `.gitignore`); use sempre os respectivos `.env.example` como referência ao adicionar novas variáveis.

## Deploy em produção

- **Frontend**: Vercel (build Vite estático).
- **Backend**: Render, servido via Gunicorn (não o servidor de dev do Flask).
- **Bancos**: Neon Postgres — um projeto Neon por banco (`anonimo_db`, `auth_db`, `memoria_db`), refletindo a separação usada em dev.
