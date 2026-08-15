# Modelo de Dados

Três bancos Postgres fisicamente separados. Nenhuma tabela do banco anônimo
pode conter chave estrangeira ou campo que aponte para o banco de
autenticação, e vice-versa. A ligação entre "quem pode ver o quê" é feita
inteiramente na camada de aplicação (backend), nunca via join de banco.

## 1. Banco Anônimo (`anonimo_db`)

Armazena tudo relacionado a coleta e agregação de respostas. Nenhum campo
identifica o respondente.

| Tabela | Campos principais | Observações |
|---|---|---|
| `instituicoes` | id, nome, uf, municipio, ativo | Cadastro de instituições participantes |
| `setores` | id, instituicao_id, nome, ativo | Setor/área dentro da instituição |
| `questionarios` | id, titulo, instrumento (karasek/copsoq), versao, ativo | Um questionário por instrumento/versão |
| `dominios` | id, questionario_id, nome, ordem | Domínios/dimensões do instrumento (ex.: "Exigências", "Controle") |
| `itens` | id, dominio_id, texto, tipo_resposta, ordem, regra_condicional | Perguntas individuais |
| `respostas_brutas` | id, questionario_id, instituicao_id, setor_id, respondido_em, payload_json | **Sem qualquer campo identificador do respondente** |
| `resultados_agregados` | id, instituicao_id, setor_id, questionario_id, dominio_id, periodo, valor_agregado, n_respostas | Pré-calculado; usado no dashboard, já considerando threshold de k-anonimato |

## 2. Banco de Autenticação (`auth_db`)

Armazena identidade e controle de acesso — nunca dados de resposta.

| Tabela | Campos principais | Observações |
|---|---|---|
| `usuarios` | id, nome, email, senha_hash, papel (consultor/administrador), ativo | Papel define nível de acesso |
| `consultor_instituicao` | id, usuario_id, instituicao_id | Vínculo N:N — um consultor pode atender várias instituições |
| `sessao_login` | id, usuario_id, token, criado_em, expira_em, ip, user_agent | Controle de sessão ativa |
| `log_atividade` | id, usuario_id, acao, entidade, entidade_id, criado_em | Trilha de auditoria (ex.: exportação de CSV, alteração de threshold) |

> `instituicao_id` aqui é apenas um identificador numérico replicado do
> banco anônimo — nunca há join direto entre os bancos; a aplicação resolve
> essa referência via duas consultas separadas.

## 3. Banco de Memória Institucional (`memoria_db`)

Registros históricos vinculados a instituições já cadastradas.

| Tabela | Campos principais | Observações |
|---|---|---|
| `instituicoes_referencia` | id, instituicao_id, nome | Espelho leve do cadastro de instituições, para não depender do banco anônimo em tempo real |
| `registros_memoria` | id, instituicao_id, tipo, titulo, descricao, anexo_url, criado_em | Documentos, atas de roda de conversa, ações realizadas |
| `linha_do_tempo` | id, instituicao_id, evento, data_evento, registro_memoria_id | Eventos institucionais relevantes para o histórico |

## Regras de integridade entre bancos

- Toda referência cruzada usa `instituicao_id` como identificador lógico
  comum — nunca uma foreign key real entre bancos distintos.
- Exclusão de uma instituição deve ser tratada como processo coordenado na
  camada de aplicação (soft delete + verificação nos 3 bancos), nunca como
  `ON DELETE CASCADE` de banco.
- `respostas_brutas` nunca deve ser exposta via API sem passar pelo filtro
  de k-anonimato — exceto na rota específica de exportação CSV, que exige
  tela de confirmação (ver `05-regras-de-negocio-e-privacidade.md`).
