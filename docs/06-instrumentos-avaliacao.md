# Instrumentos de Avaliação de Riscos Psicossociais

O sistema suporta dois instrumentos validados. O Administrador escolhe o
instrumento **por domínio** ao montar um questionário (`dominios.instrumento`)
— um questionário pode ter só um instrumento ou combinar os dois (ver
"Regras comuns" abaixo).

## Karasek Demand-Control

- Modelo clássico de avaliação de estresse ocupacional, baseado em dois
  eixos: **Demanda psicológica** e **Controle sobre o trabalho**.
- Classificação final em **quatro quadrantes**:
  1. Alta demanda / Baixo controle → **Alto desgaste** (maior risco)
  2. Alta demanda / Alto controle → **Trabalho ativo**
  3. Baixa demanda / Baixo controle → **Trabalho passivo**
  4. Baixa demanda / Alto controle → **Baixo desgaste** (menor risco)
- Cálculo: cada respondente recebe um escore de demanda e um escore de
  controle (soma ponderada dos itens do respectivo domínio); o
  cruzamento das médias (ou medianas, conforme metodologia adotada)
  define o quadrante do grupo agregado.
- **Importante:** o quadrante nunca é calculado nem exibido para o
  respondente individual — apenas de forma agregada, sujeito a
  k-anonimato, e apenas para Consultor/Administrador.

## COPSOQ (Copenhagen Psychosocial Questionnaire)

- Instrumento multidimensional, organizado em domínios (ex.: exigências
  no trabalho, organização do trabalho, relações sociais, valores no
  local de trabalho, saúde e bem-estar — os domínios exatos dependem da
  versão adotada).
- Cada domínio gera um **escore de 0 a 100**.
- Escores são classificados em **três faixas**:
  - Verde (favorável / baixo risco)
  - Amarelo (intermediário / atenção)
  - Vermelho (desfavorável / alto risco)
- Cálculo por domínio: média dos itens daquele domínio, normalizada para
  a escala 0–100, depois classificada na faixa correspondente.
- Assim como no Karasek, resultado por domínio só é visível de forma
  agregada, sujeito a k-anonimato, para Consultor/Administrador.

## Regras comuns aos dois instrumentos

- O respondente (Usuário) só vê as perguntas — nunca o nome do
  instrumento, nem o cálculo, nem a classificação.
- O motor de cálculo deve ser desacoplado da UI: o backend calcula e
  persiste o resultado agregado (`resultados_agregados`); o frontend
  apenas renderiza o que a API retorna, já filtrado por k-anonimato.
- Novos instrumentos devem poder ser adicionados sem alterar a estrutura
  central de `questionarios`/`dominios`/`itens` — o tipo de instrumento é
  um atributo do **domínio** (`dominios.instrumento`), não do questionário,
  e a lógica de cálculo deve ser implementada como estratégia plugável no
  backend (ex.: um cálculo por `instrumento`).
- Um questionário pode ser **misto**: combinar domínios de instrumentos
  diferentes (ex.: Karasek + COPSOQ) no mesmo formulário. O backend agrupa
  os domínios por instrumento, roda a estratégia de cada grupo e une os
  resultados (`app/services/k_anonimato.py:recalcular_resultados`) — o
  respondente vê só uma lista de perguntas, sem indicação de que há mais
  de um instrumento por trás. `Questionario.modo_apresentacao` decide se
  os itens aparecem em blocos (agrupados por domínio) ou intercalados
  (alternando entre os grupos).
