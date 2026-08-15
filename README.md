# PROTEGER-NR1-EPT

Sistema web para identificação, registro e prevenção de riscos
psicossociais (NR-1) em instituições de Educação Profissional e
Tecnológica (EPT), usando os instrumentos **Karasek Demand-Control** e
**COPSOQ**. Desenvolvido como produto educacional de um mestrado
profissional na área.

## Estrutura do monorepo

```
proteger-nr1-ept/
├── frontend/    → React (Vite), deploy em produção na Vercel [scaffolding]
├── backend/     → Python (Flask + Gunicorn em produção), deploy no Render [implementado]
├── docs/        → documentação técnica de referência (arquitetura, modelo de dados, regras de negócio, API)
└── .devcontainer/ → ambiente de desenvolvimento (Dev Containers), com Postgres local simulando os 3 bancos de produção
```

## Documentação

- [`docs/00-README.md`](docs/00-README.md) — índice da documentação técnica (arquitetura, modelo de dados, papéis/fluxos, regras de negócio, instrumentos, API, stack, roadmap).
- [`backend/README.md`](backend/README.md) — como rodar o backend localmente, estrutura de pastas e decisões de implementação.
- [`CLAUDE.md`](CLAUDE.md) — guia do repositório para desenvolvimento assistido por Claude Code.

Com o backend rodando localmente, a documentação interativa da API
(Scalar) fica em `http://localhost:8000/docs/scalar`.

## Licenciamento

- Código-fonte: **PolyForm Noncommercial License 1.0.0** — uso
  não-comercial e educacional.
- Materiais pedagógicos (questionários, guias, cartilhas): **CC BY-NC-SA 4.0**.
