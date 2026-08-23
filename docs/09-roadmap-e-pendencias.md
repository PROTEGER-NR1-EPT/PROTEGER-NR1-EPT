# Roadmap e Pendências

## Cronograma alvo

- **Protótipo funcional: concluído.** Backend e frontend estão
  implementados de ponta a ponta (fluxo público, Consultor,
  Administrador, os três recursos de IA opcionais e Planos de Ação).
- **Uso como produto educacional/submissão acadêmica:** próximo marco —
  o sistema já está demonstrável; itens em aberto abaixo (TCLE/comitê de
  ética, orçamento) não bloqueiam esse uso.

## Itens em aberto (bloqueantes de decisão, não de código)

1. **Necessidade de aprovação em comitê de ética (CEP/Plataforma
   Brasil)** — pendente de confirmação junto à coordenação/orientação
   acadêmica, por envolver pesquisa com seres humanos.
   - **Se sim:** adicionar tela de TCLE (Termo de Consentimento Livre e
     Esclarecido) com checkbox obrigatório "li e concordo" como etapa
     anterior ao formulário de questionário, no fluxo do Usuário.
   - **Se não:** fluxo do Usuário permanece como descrito em
     `04-papeis-e-fluxos-de-usuario.md`, sem essa etapa.
2. **Orçamento e considerações financeiras** — ainda em aberto; hoje o
   projeto assume 100% free tier em todos os serviços.

## Fora do escopo do MVP (backlog futuro)

- Suporte a LLM local/self-hosted.
- Aplicativo móvel nativo (o web responsivo cobre a necessidade mobile
  no MVP).
- Integrações com sistemas de RH/folha de terceiros.

## Princípios de design que devem guiar decisões futuras

Ao avaliar qualquer nova funcionalidade, verificar se ela respeita:

- Decoupling de anonimato e autenticação (nunca ligar resposta a pessoa).
- k-anonimato configurável, nunca hardcoded.
- Funcionamento completo do sistema com toggles de IA desativados.
- Seleção de instituição/setor sempre via dropdown, nunca texto livre.
- Replicabilidade — nenhuma lógica deve assumir uma única instituição
  fixa.
- Consciência de free-tier (armazenamento, limites de requisições) nas
  decisões de arquitetura.
