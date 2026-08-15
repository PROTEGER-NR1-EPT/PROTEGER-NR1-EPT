# Arquitetura Técnica (resumo C4)

> Este documento resume as decisões arquiteturais definidas até o nível C4-4.
> Para o documento completo com diagramas, ver material de arquitetura
> entregue separadamente (não incluído neste repositório público).

## Visão de contexto (C4 nível 1)

```
                    ┌─────────────────────┐
                    │   Usuário Anônimo    │
                    │  (profissional EPT)  │
                    └──────────┬───────────┘
                               │ responde questionário (sem login)
                               ▼
                    ┌─────────────────────┐
       ┌───────────▶│  PROTEGER-NR1 EPT   │◀───────────┐
       │            │      (sistema)       │            │
       │            └─────────────────────┘            │
       │ login                                   login  │
┌──────┴──────┐                              ┌──────────┴────┐
│  Consultor   │                              │ Administrador │
│ (visualiza   │                              │ (gerencia     │
│ resultados)  │                              │ tudo)         │
└──────────────┘                              └───────────────┘
```

## Visão de contêineres (C4 nível 2)

| Contêiner | Tecnologia | Responsabilidade |
|---|---|---|
| Frontend Web | React (Vite), hospedado na Vercel | Formulários públicos, dashboards de resultados, telas administrativas |
| Backend API | Flask + Gunicorn, hospedado no Render | Regras de negócio, autenticação, cálculo de instrumentos, k-anonimato |
| Banco Anônimo | Neon Postgres (projeto dedicado) | Instituições, setores, questionários, itens, respostas brutas, resultados agregados |
| Banco de Autenticação | Neon Postgres (projeto dedicado) | Usuários, vínculos consultor-instituição, sessões de login, log de atividade |
| Banco de Memória Institucional | Neon Postgres (projeto dedicado) | Registros históricos vinculados a instituições cadastradas |

## Decisão arquitetural central: separação de bancos

Os três bancos são **fisicamente separados** (projetos Neon distintos), não
apenas schemas separados em uma mesma instância. Essa decisão existe para
reforçar, em nível de infraestrutura, que:

- Dados de resposta (banco anônimo) nunca podem conter campos identificadores.
- Um vazamento ou acesso indevido ao banco de autenticação não expõe
  respostas de questionários.
- O banco de memória institucional pode ser auditado/exportado
  separadamente sem tocar em dados sensíveis de resposta individual.

## Visão de componentes (C4 nível 3) — Backend

```
Backend API
├── Módulo de Autenticação
│   ├── Login / sessão (Consultor, Administrador)
│   └── Gestão de vínculos Consultor–Instituição
├── Módulo de Questionários
│   ├── CRUD de questionários e itens (Administrador)
│   └── Motor de regras/lógica condicional
├── Módulo de Respostas
│   ├── Recebimento de respostas anônimas (Usuário)
│   └── Cálculo de instrumentos (Karasek, COPSOQ)
├── Módulo de Agregação e k-anonimato
│   ├── Cálculo de resultados agregados por instituição/setor
│   └── Aplicação de threshold de k-anonimato configurável
├── Módulo de Memória Institucional
│   └── Registro e consulta de histórico por instituição
├── Módulo de Exportação
│   └── Exportação de CSV bruto (com aviso obrigatório de sensibilidade)
├── Módulo de Configurações
│   └── Threshold de k-anonimato, toggles de LLM, logs
└── Módulo de IA (opcional, desativável)
    ├── Cliente HTTP único, formato compatível OpenAI
    └── Providers: Anthropic, OpenAI, Gemini, OpenRouter, NVIDIA Build
```

## Requisitos não funcionais

- **Funcionar 100% sem IA ativada.** Todas as funcionalidades essenciais
  (questionário, resultado, memória institucional) não podem depender de
  nenhuma chamada a LLM.
- **Mobile-first e responsivo** desde a primeira tela.
- **Acessibilidade eMAG/WCAG**: controles de tamanho de fonte (A-/A/A+),
  modo alto contraste, navegação por teclado, estrutura semântica para
  leitores de tela, texto alternativo em imagens.
- **Multi-institucional desde o MVP** — nenhuma lógica deve assumir uma
  única instituição fixa; seleção de instituição/setor é sempre via
  dropdown (nunca texto livre), para evitar fragmentação de agregação por
  erro de digitação/duplicidade.
- **Free-tier aware** — armazenamento do Neon é limitado; deve existir
  rotina de limpeza de logs.
