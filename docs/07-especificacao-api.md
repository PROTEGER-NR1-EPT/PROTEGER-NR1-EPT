# Especificação de API (rascunho)

> Rascunho de referência para orientar a implementação do backend Flask.
> Nomes de rotas e payloads podem ser ajustados durante o desenvolvimento;
> o que deve ser preservado são as fronteiras de acesso por papel.

> **Status:** as rotas Público/Consultor/Administrador abaixo estão
> implementadas em `backend/app/blueprints/`, com o mesmo prefixo
> (`/api/v1`) e as mesmas fronteiras de acesso por papel descritas aqui.
> As rotas de **IA** (seção abaixo) e **TCLE** (`/tcle/{instituicao_id}`)
> ainda **não foram implementadas** — ver `docs/09-roadmap-e-pendencias.md`
> (TCLE depende de decisão sobre comitê de ética) e o item "NÃO IMPLEMENTAR
> AINDA" do escopo do MVP.
>
> Para o contrato exato (schemas de request/response, exemplos, todos os
> códigos de erro possíveis por rota), a referência autoritativa e sempre
> atualizada é a documentação OpenAPI/Scalar gerada a partir do código:
> rode o backend localmente e acesse `http://localhost:8000/docs/scalar`
> (ver `backend/README.md`). Este documento continua útil como visão geral
> rápida, mas pode divergir em detalhes finos do que está implementado.

Convenção: prefixo `/api/v1`. Autenticação via token de sessão (cookie ou
bearer token), exceto rotas marcadas como públicas.

## Público (sem autenticação)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/instituicoes` | Lista instituições ativas (para dropdown) |
| GET | `/instituicoes/{id}/setores` | Lista setores de uma instituição (para dropdown) |
| GET | `/questionarios/ativo` | Retorna os itens (já em ordem final — blocos ou intercalado) do questionário vinculado à instituição (`instituicoes.questionario_id`), sem revelar instrumento/domínio |
| POST | `/respostas` | Envia respostas do Usuário (payload sem identificador pessoal) |
| GET | `/tcle/{instituicao_id}` | Retorna texto do TCLE vigente, se aplicável *(condicional)* |

## Consultor (autenticado)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| GET | `/auth/sessao` | Restaura a sessão a partir do cookie httpOnly do login (usado pelo frontend após F5) |
| PUT | `/auth/senha` | Altera a senha do usuário autenticado (exige senha atual) |
| GET | `/consultor/instituicoes` | Lista instituições vinculadas ao consultor logado |
| GET | `/consultor/instituicoes/{id}/resultados` | Resultados agregados (já filtrados por k-anonimato) |
| GET | `/consultor/instituicoes/{id}/resultados-dashboard` | Mesmo formato do dashboard multi-filtro do Administrador (inclui `risco`/`nivel_risco`, usado pelos cards/radar/mapa de risco), escopado à instituição vinculada |
| GET | `/consultor/instituicoes/{id}/memoria` | Registros de memória institucional |
| GET | `/consultor/instituicoes/{id}/planos-acao` | Planos de ação (ciclos) de uma instituição vinculada — somente leitura |
| GET | `/consultor/planos-acao/{id}/acoes` | Ações de um plano (tarefas e dependências resolvidas na leitura) — somente leitura |

## Administrador (autenticado)

| Método | Rota | Descrição |
|---|---|---|
| GET/POST | `/admin/instituicoes` | Listar/criar instituições (inclui vínculo `questionario_id`) |
| PUT/DELETE | `/admin/instituicoes/{id}` | Editar/desativar instituição, inclusive trocar/remover o questionário vinculado |
| GET/POST | `/admin/setores` | Listar/criar setores |
| GET/POST | `/admin/questionarios` | Listar/criar questionários — vários podem estar ativos ao mesmo tempo; cada domínio carrega seu próprio instrumento (questionários mistos) |
| PUT | `/admin/questionarios/{id}` | Editar questionário/domínios/itens (inclui `modo_apresentacao`: blocos ou intercalado) |
| DELETE | `/admin/questionarios/{id}` | Excluir questionário — bloqueado se já houver respostas registradas (usar `ativo: false` para desativar nesse caso) |
| GET/POST | `/admin/usuarios` | Listar (inclui instituições vinculadas de cada Consultor)/criar Consultores e Administradores |
| PUT | `/admin/usuarios/{id}` | Editar nome/e-mail/papel (não altera senha) |
| DELETE | `/admin/usuarios/{id}` | Desativar usuário (soft delete — impede login, preserva log/vínculos; não é possível desativar a própria conta) |
| POST | `/admin/usuarios/{id}/vinculos` | Vincular consultor a instituição(ões) |
| DELETE | `/admin/usuarios/{id}/vinculos/{instituicao_id}` | Remover um vínculo específico |
| GET | `/admin/instituicoes/{id}/resultados` | Resultados agregados de qualquer instituição |
| GET | `/admin/resultados` | Dashboard de resultados por dimensão, com filtro multi-seleção (`instituicao_ids`, `setor_ids`, `questionario_ids`) e por instrumento (`karasek`/`copsoq`/`misto`); inclui `risco`/`nivel_risco` (0-100, 4 faixas, comparável entre instrumentos) |
| GET | `/admin/respostas/export` | Exportação CSV bruta (requer confirmação prévia — ver doc 05) |
| GET/PUT | `/admin/configuracoes` | Threshold de k-anonimato, toggles de IA, provedor LLM |
| GET | `/admin/logs` | Log de atividade |
| POST/GET | `/admin/memoria` | Criar/consultar registros de memória institucional |
| GET/POST | `/admin/instituicoes/{id}/planos-acao` | Listar/criar planos de ação (ciclos) de uma instituição |
| PUT/DELETE | `/admin/planos-acao/{id}` | Editar (renomear ciclo) / excluir um plano de ação (cascata: ações, tarefas e dependências) |
| GET/POST | `/admin/planos-acao/{id}/acoes` | Listar/criar ações de um plano (tarefas e dependências resolvidas na leitura) |
| PUT/DELETE | `/admin/acoes/{id}` | Editar (inclui status/ordem do Kanban) / excluir uma ação |
| PUT | `/admin/tarefas/{id}` | Marcar/desmarcar uma tarefa do checklist |
| POST | `/admin/planos-acao/{id}/gerar-sugestoes` | Gerar ações-rascunho a partir de dimensões em risco alto/crítico (regra determinística, sem LLM) |
| GET | `/admin/estatisticas` | Contagens gerais para o painel do Administrador (instituições, questionários, usuários, respostas, alerta de k-anonimato e ranking por instituição) |

## IA (opcional — apenas se toggle ativado)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/admin/ia/questionario/status` | Disponibilidade da criação assistida de questionário (`ia_sugestao_questionario_enabled` + provedor LLM configurado) |
| POST | `/admin/ia/questionario/sugestao` | Gera um rascunho de questionário (domínios + itens) a partir de um pedido em texto livre — não grava nada no banco, só retorna o rascunho no formato de `POST /admin/questionarios` para revisão do Administrador |

Todas as rotas de IA devem verificar o toggle correspondente **no
backend** antes de processar — nunca confiar apenas em o frontend
esconder o botão.

`POST /admin/ia/questionario/sugestao` valida a resposta da IA contra o
mesmo schema Pydantic usado por `POST /admin/questionarios`
(`CriarQuestionarioBody`) e contra a mesma checagem de instrumento —
domínios `karasek` precisam ter chaves exatamente `demanda`/`controle`,
igual à exigência de `app/services/instrumentos/karasek.py`. Se a IA
responder algo fora desse formato, retorna 502 `ia_resposta_invalida`
pedindo para tentar novamente.

### Chat de ajuda contextual (`/chat/*`) — implementado

Consultor e Administrador logados; disponível conforme `ia_chat_enabled`
e provedor LLM configurado (`GET /chat/status`). Uma pessoa pode ter
várias conversas distintas — cada uma com seu próprio fio de mensagens.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/chat/status` | `{disponivel: bool}` — usado pelo frontend pra decidir se mostra o widget/menu |
| POST | `/chat/conversas` | Cria uma nova conversa (sempre para o próprio usuário) |
| GET | `/chat/conversas` | Lista as conversas do usuário (Administrador pode informar `usuario_id` p/ auditar outro) |
| GET | `/chat/conversas/{id}/mensagens` | Mensagens de uma conversa |
| DELETE | `/chat/conversas/{id}` | Exclui uma conversa |
| GET | `/chat/conversas/{id}/export` | Exporta uma conversa (CSV) |
| POST | `/chat/mensagens` | Envia mensagem (`conversa_id` opcional — omitido = continua/cria a mais recente; `instituicao_id` opcional — Consultor só de instituição vinculada) |
| GET | `/chat/mensagens` | Histórico completo do usuário (todas as conversas) |
| DELETE | `/chat/mensagens` | Exclui todas as conversas do usuário |
| GET | `/chat/mensagens/export` | Exporta todas as conversas do usuário (CSV) |

### Análise assistida de resultados (`/ia/resultados/*`) — implementado

Consultor e Administrador logados; disponível conforme
`ia_analise_resultados_enabled` e provedor LLM configurado
(`GET /ia/resultados/status`). A análise processa exatamente a lista de
dimensões que o frontend já tem carregada na tela (mesmo formato de
`GET /admin/resultados` ou
`GET /consultor/instituicoes/{id}/resultados-dashboard`, já filtrada por
k-anonimato) — o backend não refaz a consulta nem recebe filtros de
instituição/setor, só o recorte já exibido. Sem persistência: cada
chamada gera um texto novo.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/ia/resultados/status` | `{disponivel: bool}` — usado pelo frontend pra decidir se mostra a aba "Análise IA" |
| POST | `/ia/resultados/analise` | Gera uma análise em Markdown (`{resultados: [...]}` → `{analise: "..."}`) a partir de até 300 dimensões |

## Padrão de resposta de erro

```json
{
  "erro": "codigo_do_erro",
  "mensagem": "Descrição amigável do erro",
  "detalhes": {}
}
```

## Padrão de resposta ao aplicar k-anonimato

`setor_nome`/`dominio_nome` vêm resolvidos pelo backend (Consultor e
Administrador têm permissão para ver essa identidade — docs/04); `dominio_id`
e `dominio_nome` vêm nulos na linha "geral" de um instrumento (ex.: quadrante
do Karasek, que cruza dois domínios).

```json
{
  "instituicao_id": 12,
  "setor_id": 4,
  "setor_nome": "Coordenação Pedagógica",
  "questionario_id": 7,
  "dominio_id": 9,
  "dominio_nome": "Controle sobre o Trabalho",
  "periodo": "consolidado",
  "n_respostas": 3,
  "threshold": 5,
  "resultado_disponivel": false,
  "valor_agregado": null
}
```
