# Regras de Negócio e Privacidade

## k-anonimato

- Define o número mínimo de respondentes necessário para que um resultado
  agregado (por instituição + setor + domínio + período) seja exibido.
- Valor padrão: **5**. Configurável por Administrador em Configurações,
  não hardcoded no código.
- Se o número de respostas de um grupo for menor que o threshold
  configurado, o resultado daquele grupo deve ser **ocultado** na
  visualização (ex.: "Dados insuficientes para exibição — mínimo de N
  respostas necessário"), tanto no dashboard de Consultor quanto no de
  Administrador.
- O cálculo do threshold deve ser aplicado no momento da consulta/leitura,
  não apenas no momento de gravação — mudanças no threshold devem
  refletir imediatamente em resultados já existentes.

## Decoupling de anonimato e autenticação

- Regra arquitetural inegociável: nenhuma tabela de `respostas_brutas`
  pode conter identificador de pessoa física (nome, e-mail, matrícula,
  IP, etc.).
- Nenhuma referência cruzada direta (foreign key) deve existir entre o
  banco anônimo e o banco de autenticação.
- Qualquer funcionalidade nova que pareça exigir ligar uma resposta a uma
  pessoa deve ser rejeitada ou levada de volta à discussão de design —
  fere o princípio central do sistema.

## Exportação de dados brutos (CSV)

- A exportação de `respostas_brutas` em CSV **contorna** o filtro de
  k-anonimato do dashboard (é dado desagregado).
- Antes de permitir o download, o sistema deve exibir uma tela de aviso
  obrigatória, com confirmação explícita, informando que:
  - os dados são sensíveis sob a LGPD mesmo sendo nominalmente anônimos
    (podem ser reidentificáveis por cruzamento, ex.: setor pequeno);
  - o uso e guarda desses dados é de responsabilidade de quem exporta.
- Toda exportação deve ser registrada no `log_atividade` (quem exportou,
  quando, filtros aplicados).

## Seleção de instituição/setor via dropdown

- Instituição e setor são sempre selecionados por **dropdown**, nunca
  digitados livremente pelo Usuário.
- Motivo: texto livre gera fragmentação de agregação (erros de
  digitação, variações de nome, duplicidade), o que compromete tanto os
  relatórios quanto o cálculo correto de k-anonimato.
- Cadastro de novas instituições/setores é responsabilidade exclusiva do
  Administrador.

## Funcionamento sem IA

- Toda funcionalidade essencial do sistema (responder questionário, ver
  resultado, registrar memória institucional) deve funcionar
  integralmente com todos os toggles de LLM desativados.
- Recursos de IA nunca podem ser pré-requisito de um fluxo crítico.

## Salvaguardas de escopo dos recursos de IA

- Toda resposta gerada por IA (Chat de ajuda, Criação assistida de
  questionário, Análise assistida de resultados, e qualquer recurso de
  IA futuro) é restrita ao tema do sistema PROTEGER-NR1 EPT — a IA pode
  cumprimentar com cordialidade ("bom dia", "boa noite" etc.) e manter
  tom gentil, mas recusa educadamente qualquer pedido fora desse escopo.
- Essa regra é aplicada via `GUARDRAIL_ESCOPO`, em
  `backend/app/services/llm_client.py`, sempre concatenada ao prompt de
  sistema específico de cada funcionalidade.
- **Toda nova funcionalidade de IA deve chamar o provedor LLM através de
  `services/llm_client.chamar_llm()` — nunca instanciar `OpenAI(...)`
  diretamente num service novo.** É esse ponto de entrada único que
  garante a salvaguarda de escopo sem depender de cada implementação
  futura lembrar de replicá-la.

## LGPD — princípios gerais aplicados

- Minimização de dados: coletar apenas o necessário para o cálculo dos
  instrumentos (Karasek/COPSOQ) e para a agregação institucional.
- Anonimização por design: ausência de identificadores é decisão de
  arquitetura, não apenas de política de uso.
- Transparência: TCLE (se exigido por comitê de ética) deve informar
  claramente finalidade, uso e guarda dos dados antes da coleta.
- Retenção: rotina de limpeza de logs de sessão/atividade antigos, tanto
  por boas práticas de privacidade quanto por limitação de
  armazenamento do free-tier do banco.
