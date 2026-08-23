# Papéis e Fluxos de Usuário

## Papéis do sistema

### 1. Usuário (sem login)

Profissional da instituição respondendo ao questionário.

**Fluxo:**
1. Acessa a página institucional pública (`/`) e clica em "Participar da
   pesquisa", indo para `/participar` — a tela de seleção de
   instituição/setor propriamente dita (pode-se chegar direto em
   `/participar` também, ex.: link divulgado pela instituição).
2. Seleciona instituição (dropdown).
3. Seleciona setor (dropdown, filtrado pela instituição escolhida).
4. *(Condicional — pendente de definição)* Tela de TCLE (Termo de
   Consentimento Livre e Esclarecido), com checkbox "li e concordo",
   obrigatória caso o projeto exija aprovação de comitê de ética.
5. Responde ao questionário vinculado àquela instituição (Karasek,
   COPSOQ, ou os dois combinados num único questionário "misto" —
   configurado pelo Administrador).
6. Vê apenas as perguntas — nunca o nome do instrumento, nem qualquer
   resultado calculado.
7. Tela de agradecimento/confirmação de envio.

**Restrições de exibição:** o Usuário não deve, em nenhuma tela, ver
identidade do instrumento aplicado, cálculo de quadrante/domínio, ou
qualquer dado agregado.

### 2. Consultor (login obrigatório)

Visualiza resultados apenas das instituições às quais está vinculado.

**Fluxo:**
1. Login (e-mail/senha).
2. Dashboard: lista de instituições vinculadas.
3. Seleciona instituição → visualiza resultados agregados por
   setor/domínio/quadrante, sujeitos ao threshold de k-anonimato (grupos
   abaixo do threshold aparecem ocultos/insuficientes).
4. Pode consultar registros de memória institucional daquela instituição.
5. Consulta (somente leitura) os Planos de Ação das instituições
   vinculadas — ciclos, ações, tarefas e dependências.
6. Se o Administrador tiver ativado o toggle, usa o Assistente IA (chat
   de ajuda contextual) e a análise assistida de resultados.
7. "Meu perfil": consulta nome/e-mail/papel e troca a própria senha —
   mesma tela do Administrador (rodapé da sidebar).
8. Não pode criar questionários, gerenciar usuários, nem alterar
   configurações do sistema.

### 3. Administrador (login obrigatório)

Acesso completo.

**Fluxo (funcionalidades principais):**
1. Login.
2. CRUD de questionários, domínios, itens e regras condicionais —
   vários questionários podem estar ativos (disponíveis) ao mesmo tempo,
   inclusive questionários **mistos** (combinando domínios de
   instrumentos diferentes); pré-visualização estilo formulário antes de
   publicar.
3. Cadastro/edição de instituições e setores, incluindo qual questionário
   cada instituição usa no fluxo público.
4. Cadastro de Consultores e outros Administradores; gestão de vínculos
   consultor-instituição.
5. Visualização de resultados de todas as instituições (sem restrição de
   vínculo).
6. Configurações do sistema:
   - Threshold de k-anonimato (padrão 5, ajustável).
   - Toggles de recursos de IA (por funcionalidade: criação assistida de
     questionário, análise assistida de resultados, chat de ajuda
     contextual).
   - Configuração do provedor LLM (se ativado).
7. Exportação de CSV de respostas brutas — exige confirmação explícita
   em tela de aviso sobre sensibilidade dos dados (ver documento 05).
8. Consulta ao log de atividade.
9. "Meu perfil": consulta nome/e-mail/papel e troca a própria senha
   (`PUT /auth/senha`, exige senha atual) — acessível pelo rodapé da
   sidebar, igual para Consultor e Administrador.

## Primeiro acesso (bootstrap)

O primeiro Administrador não é criado por tela de cadastro — é provisionado
automaticamente no deploy do backend, via variáveis de ambiente
(`ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD`), executado uma única
vez por um script de bootstrap.

## Matriz de permissões (resumo)

| Ação | Usuário | Consultor | Administrador |
|---|:---:|:---:|:---:|
| Responder questionário | ✅ | ❌ | ❌ |
| Ver resultado agregado (instituições vinculadas) | ❌ | ✅ | ✅ (todas) |
| Ver identidade do instrumento/domínio | ❌ | ✅ | ✅ |
| Criar/editar questionário | ❌ | ❌ | ✅ |
| Cadastrar instituição/setor | ❌ | ❌ | ✅ |
| Cadastrar usuários | ❌ | ❌ | ✅ |
| Exportar CSV bruto | ❌ | ❌ | ✅ |
| Alterar threshold de k-anonimato | ❌ | ❌ | ✅ |
| Configurar integração LLM | ❌ | ❌ | ✅ |
