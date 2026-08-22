# PROTEGER-NR1-EPT

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://www.python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Code license](https://img.shields.io/badge/code_license-PolyForm_Noncommercial_1.0.0-blue)](./LICENSE)
[![Content license](https://img.shields.io/badge/content_license-CC_BY--NC--SA_4.0-lightgrey?logo=creativecommons&logoColor=white)](./docs/LICENSE-MATERIAIS.md)

Sistema web para identificação, registro e prevenção de riscos
psicossociais (NR-1) em instituições de Educação Profissional e
Tecnológica (EPT), usando os instrumentos **Karasek Demand-Control** e
**COPSOQ**. Desenvolvido como produto educacional de um mestrado
profissional na área.

**[Wiki do projeto](https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT/wiki)**
— manual de uso do sistema: como funciona e como usá-lo, para
Administrador, Consultor e quem responde o questionário.

## Funcionalidades

- **Fluxo público de resposta** — participação anônima, sem login, com
  termo de consentimento opcional por instituição.
- **Questionários Karasek e COPSOQ** (inclusive mistos, combinando os
  dois no mesmo formulário), com criação assistida por IA.
- **Resultados agregados**, protegidos por k-anonimato configurável —
  cartões-resumo, radar por dimensão e mapa de risco por setor, tanto
  para o Consultor (instituições vinculadas) quanto para o
  Administrador (todas, com filtro multi-seleção).
- **Planos de ação** por ciclo — Kanban, tabela e calendário, com
  tarefas (checklist) e dependências entre ações.
- **Memória institucional** — registro histórico de cada instituição.
- **Recursos de IA opcionais** (desligados por padrão) — chat de ajuda
  contextual, criação assistida de questionário e análise assistida de
  resultados, compatíveis com múltiplos provedores LLM (Anthropic,
  OpenAI, Gemini, OpenRouter, NVIDIA Build, Cohere).
- **Exportação de dados** (CSV/PDF) — respostas brutas, resultados,
  planos de ação, questionários e um relatório em PDF da Visão geral.
- **Administração completa** — instituições, setores, usuários
  (Consultor/Administrador), log de atividade e reset total do sistema
  (com dupla confirmação).

## Estrutura do monorepo

```
proteger-nr1-ept/
├── frontend/    → React (Vite), deploy em produção na Vercel [implementado]
├── backend/     → Python (Flask + Gunicorn em produção), deploy no Render [implementado]
├── docs/        → documentação técnica (arquitetura, modelo de dados, regras de negócio, API) + guia de uso em docs/guia/
└── .devcontainer/ → ambiente de desenvolvimento (Dev Containers), com Postgres local simulando os 3 bancos de produção
```

## Documentação

- **[Wiki do projeto](https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT/wiki)** — manual de uso (não-técnico), publicado a partir de [`docs/guia/`](docs/guia/00-indice.md).
- [`docs/00-README.md`](docs/00-README.md) — índice da documentação técnica (arquitetura, modelo de dados, papéis/fluxos, regras de negócio, instrumentos, API, stack, roadmap).
- [`backend/README.md`](backend/README.md) — como rodar o backend localmente, estrutura de pastas e decisões de implementação.
- [`frontend/README.md`](frontend/README.md) — como rodar o frontend localmente, estrutura de pastas e decisões de implementação (inclusive por que o token de sessão fica só em memória).
- [`CLAUDE.md`](CLAUDE.md) — guia do repositório para desenvolvimento assistido por Claude Code.

Com o backend rodando localmente, a documentação interativa da API
(Scalar) fica em `http://localhost:8000/docs/scalar`.

## Licenciamento

Este projeto usa **licenciamento duplo**, separando código e conteúdo pedagógico:

| Conteúdo | Licença | Arquivo |
|---|---|---|
| Código-fonte (`frontend/`, `backend/`, scripts, configs) | [PolyForm Noncommercial 1.0.0](./LICENSE) | `LICENSE` |
| Materiais pedagógicos (questionários, cartilhas, roteiros, guias em `docs/`) | [CC BY-NC-SA 4.0](./docs/LICENSE-MATERIAIS.md) | `docs/LICENSE-MATERIAIS.md` |

**Permitido:** uso livre e gratuito em instituições de ensino públicas e para
fins educacionais, de pesquisa e não comerciais, incluindo adaptação para
outras instituições de Educação Profissional e Tecnológica (EPT).

**Vedado:** exploração comercial, revenda, ou uso do sistema/materiais em
processos de licitação ou contratação por terceiros com fins lucrativos.

Cada arquivo de material pedagógico deve conter, em seu cabeçalho, a nota:

```
Licenciado sob CC BY-NC-SA 4.0 — https://creativecommons.org/licenses/by-nc-sa/4.0/
```
