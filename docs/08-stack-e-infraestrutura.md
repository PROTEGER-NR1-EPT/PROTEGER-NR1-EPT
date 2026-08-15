# Stack Tecnológica e Infraestrutura

Todos os serviços usam camadas gratuitas (free tier), o que impõe algumas
restrições de design (ver `09-roadmap-e-pendencias.md` e regras de limpeza
de logs em `05-regras-de-negocio-e-privacidade.md`).

## Frontend

- **React** (Vite como bundler)
- Hospedagem: **Vercel**
- Mobile-first, responsivo desde o início
- Acessibilidade: eMAG/WCAG (controles de fonte A-/A/A+, alto contraste,
  navegação por teclado, HTML semântico, alt text em imagens)

## Backend

- **Python (Flask)** + **Gunicorn** como servidor WSGI
- Hospedagem: **Render**
- **SQLAlchemy** (via Flask-SQLAlchemy) como ORM + **Flask-Migrate**
  (Alembic) para migrations — um único diretório `migrations/`, cobrindo
  os três bancos via `SQLALCHEMY_BINDS`/`--multidb`
- Autenticação por **token de sessão opaco** (não JWT), persistido na
  tabela `sessao_login`; senhas com **bcrypt**
- **Documentação da API**: OpenAPI gerado automaticamente a partir do
  código (`flask-openapi3`), com UI interativa **Scalar** self-hosted
  (sem dependência de CDN) em `/docs/scalar` — ver `backend/README.md`
- Script de bootstrap: cria o primeiro Administrador via variáveis de
  ambiente no deploy (`ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD`)

## Bancos de dados

- **Neon Postgres** — três projetos totalmente separados:
  - Banco anônimo (respostas e agregações)
  - Banco de autenticação (usuários, sessões, log de atividade)
  - Banco de memória institucional
- Free tier do Neon tem limite de armazenamento — justifica rotina de
  limpeza periódica de `sessao_login` e `log_atividade` antigos.

## Integração de IA (opcional)

- Cliente HTTP único, formato compatível com API da OpenAI (permite
  trocar apenas a base URL/chave para alternar provedor).
- Provedores suportados: **Anthropic, OpenAI, Gemini, OpenRouter, NVIDIA
  Build**.
- Três funcionalidades independentemente ativáveis pelo Administrador:
  1. Criação assistida de questionário
  2. Análise assistida de resultados
  3. Chat de ajuda contextual
- Configuração (provedor, chave, base URL) fica em
  `/admin/configuracoes`, nunca hardcoded.
- Suporte a LLM local (self-hosted) está fora do escopo do MVP —
  planejado apenas para versão futura.

## Ambiente de desenvolvimento

- **Devcontainer** (`.devcontainer/`) com Node LTS + Python 3.11, Postgres
  local via docker-compose simulando os 3 bancos separados.
- Ver `.devcontainer/devcontainer.json` e `.devcontainer/docker-compose.yml`
  na raiz do repositório.

## Controle de versão e licenciamento

- Repositório público no **GitHub**, dedicado ao projeto (não hospedado
  em repositório institucional).
- Código-fonte: **PolyForm Noncommercial License 1.0.0** — uso
  não-comercial e educacional, sem exploração comercial (incluindo
  revenda ou uso em licitações públicas).
- Materiais pedagógicos (questionários, guias, cartilhas):
  **CC BY-NC-SA 4.0**.
