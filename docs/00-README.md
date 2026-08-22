# Documentação Técnica — PROTEGER-NR1 EPT

Esta pasta reúne a documentação técnica de referência do projeto, usada para
planejamento e desenvolvimento (frontend e backend) com apoio do Claude Code.

Não contém dados pessoais, nomes de pessoas físicas, e-mails ou qualquer
informação sensível — o repositório é público, licenciado sob PolyForm
Noncommercial License 1.0.0 (código) e CC BY-NC-SA 4.0 (materiais
pedagógicos).

## Índice

| Arquivo | Conteúdo |
|---|---|
| `01-visao-geral-do-produto.md` | Contexto, objetivo, escopo e módulos do produto |
| `02-arquitetura-tecnica.md` | Visão C4 resumida, decisões arquiteturais e diagrama de contexto |
| `03-modelo-de-dados.md` | Estrutura dos 3 bancos de dados (anônimo, autenticação, memória institucional) |
| `04-papeis-e-fluxos-de-usuario.md` | Papéis de usuário e fluxos de navegação |
| `05-regras-de-negocio-e-privacidade.md` | k-anonimato, LGPD, decoupling de anonimato/autenticação |
| `06-instrumentos-avaliacao.md` | Karasek Demand-Control e COPSOQ — lógica de cálculo |
| `07-especificacao-api.md` | Endpoints REST previstos por módulo |
| `08-stack-e-infraestrutura.md` | Stack tecnológica, hospedagem e integração LLM opcional |
| `09-roadmap-e-pendencias.md` | Cronograma alvo, itens em aberto, escopo futuro |
| `10-glossario.md` | Termos e siglas do domínio (NR-1, PGR, k-anonimato etc.) |

## Como usar

Ao planejar uma funcionalidade nova, comece por `02-arquitetura-tecnica.md` e
`03-modelo-de-dados.md` para entender as fronteiras do sistema, depois
consulte `04` e `07` para o fluxo e contrato de API específicos do que está
sendo implementado. `05` e `06` são obrigatórios sempre que a funcionalidade
tocar em dados de resposta, resultados ou exportação.

## Guia de uso (para quem usa o sistema, não para quem desenvolve)

A pasta `guia/` tem um manual de uso do sistema — como ele funciona e como
usá-lo, escrito para Administrador, Consultor e quem responde o
questionário, sem jargão técnico. É pensado para virar a Wiki do projeto no
GitHub. Comece por `guia/00-indice.md`.
