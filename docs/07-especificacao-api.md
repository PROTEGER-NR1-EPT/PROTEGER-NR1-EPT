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
| GET | `/questionarios/ativo` | Retorna o questionário ativo para a instituição/setor (sem revelar instrumento) |
| POST | `/respostas` | Envia respostas do Usuário (payload sem identificador pessoal) |
| GET | `/tcle/{instituicao_id}` | Retorna texto do TCLE vigente, se aplicável *(condicional)* |

## Consultor (autenticado)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| GET | `/consultor/instituicoes` | Lista instituições vinculadas ao consultor logado |
| GET | `/consultor/instituicoes/{id}/resultados` | Resultados agregados (já filtrados por k-anonimato) |
| GET | `/consultor/instituicoes/{id}/memoria` | Registros de memória institucional |

## Administrador (autenticado)

| Método | Rota | Descrição |
|---|---|---|
| GET/POST | `/admin/instituicoes` | Listar/criar instituições |
| PUT/DELETE | `/admin/instituicoes/{id}` | Editar/desativar instituição |
| GET/POST | `/admin/setores` | Listar/criar setores |
| GET/POST | `/admin/questionarios` | Listar/criar questionários |
| PUT | `/admin/questionarios/{id}` | Editar questionário/domínios/itens |
| GET/POST | `/admin/usuarios` | Listar/criar Consultores e Administradores |
| POST | `/admin/usuarios/{id}/vinculos` | Vincular consultor a instituição(ões) |
| GET | `/admin/instituicoes/{id}/resultados` | Resultados agregados de qualquer instituição |
| GET | `/admin/respostas/export` | Exportação CSV bruta (requer confirmação prévia — ver doc 05) |
| GET/PUT | `/admin/configuracoes` | Threshold de k-anonimato, toggles de IA, provedor LLM |
| GET | `/admin/logs` | Log de atividade |
| POST/GET | `/admin/memoria` | Criar/consultar registros de memória institucional |

## IA (opcional — apenas se toggle ativado)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/admin/ia/questionario/sugestao` | Geração assistida de itens de questionário |
| POST | `/admin/ia/resultados/analise` | Análise assistida de resultados agregados |
| POST | `/ia/chat` | Chat de ajuda contextual (disponível conforme papel/tela) |

Todas as rotas de IA devem verificar o toggle correspondente **no
backend** antes de processar — nunca confiar apenas em o frontend
esconder o botão.

## Padrão de resposta de erro

```json
{
  "erro": "codigo_do_erro",
  "mensagem": "Descrição amigável do erro",
  "detalhes": {}
}
```

## Padrão de resposta ao aplicar k-anonimato

```json
{
  "instituicao_id": 12,
  "setor_id": 4,
  "dominio": "controle_sobre_trabalho",
  "n_respostas": 3,
  "threshold": 5,
  "resultado_disponivel": false,
  "valor_agregado": null
}
```
