# PROTEGER-NR1-EPT

Sistema web para identificação, registro e prevenção de riscos
psicossociais (NR-1) em instituições de Educação Profissional e
Tecnológica (EPT), usando os instrumentos **Karasek Demand-Control** e
**COPSOQ**. Desenvolvido como produto educacional de um mestrado
profissional na área.

## Estrutura do monorepo

```
proteger-nr1-ept/
├── frontend/    → React (Vite), deploy em produção na Vercel [implementado]
├── backend/     → Python (Flask + Gunicorn em produção), deploy no Render [implementado]
├── docs/        → documentação técnica de referência (arquitetura, modelo de dados, regras de negócio, API)
└── .devcontainer/ → ambiente de desenvolvimento (Dev Containers), com Postgres local simulando os 3 bancos de produção
```

## Documentação

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
