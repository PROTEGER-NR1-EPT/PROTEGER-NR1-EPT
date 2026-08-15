# PROTEGER-NR1 EPT — Frontend

Frontend React (Vite) do PROTEGER-NR1 EPT. Ver `docs/` na raiz do
repositório para o contexto completo do produto, e `backend/README.md`
para como subir a API que este frontend consome.

## Stack

- **React + Vite**
- **React Router v6** — navegação entre as áreas pública, Consultor e Administrador
- **axios** — cliente HTTP (`src/api/client.js`), apontando para `VITE_API_BASE_URL`
- **Context API + hooks** — estado global (autenticação, preferências de acessibilidade); sem Redux
- **CSS Modules + Tailwind CSS v4** — ver justificativa abaixo

### CSS Modules + Tailwind, e como convivem com a acessibilidade

Os requisitos de acessibilidade (controles de fonte A-/A/A+, alto
contraste) pedem tokens de tema alteráveis em runtime — implementados
como variáveis CSS (`src/styles/tokens.css`) trocadas via
`document.documentElement` a partir de `PreferencesContext`. Convenção
seguida no projeto: cada componente/página com estilo próprio tem um
arquivo `Nome.module.css` ao lado; estilos realmente compartilhados
(tabelas administrativas, tokens, reset global) ficam em `src/styles/`.

Tailwind CSS v4 (`@tailwindcss/vite`, sem `tailwind.config.js` — config
via CSS) foi adicionado depois, para uso em componentes/páginas novas.
A razão original para evitá-lo (uma camada PostCSS extra só para trocar
tema em runtime) não se aplica mais à v4: em `src/styles/global.css`, o
bloco `@theme inline` mapeia cores/raio do Tailwind (`bg-primaria`,
`text-perigo`, `rounded-borda`, ...) para `var(--cor-*)` de
`tokens.css` em vez de valores fixos — as classes utilitárias continuam
reagindo ao modo alto contraste, exatamente como o CSS Modules já fazia.
`--font-scale` (escala de fonte) não precisa de mapeamento: como afeta o
`font-size` da raiz e todo o espaçamento do Tailwind é em `rem`, ele já
escala automaticamente. CSS Modules continuam sendo a opção padrão para
estilo específico de componente já existente; não há migração do que já
existe — é convivência, não substituição.

## Autenticação: token em memória, nunca em storage do navegador

O backend autentica por token de sessão via `Authorization: Bearer`
(ver `backend/app/auth/security.py`). Seguindo a regra do projeto de
nunca guardar dado sensível de sessão em `localStorage`/`sessionStorage`,
o token de acesso vive **só em estado de aplicação**:

- `AuthContext` (`src/context/AuthContext.jsx`) guarda `token`/`usuario` em `useState`.
- `api/client.js` mantém uma cópia do token em uma variável de módulo (não em React) só para poder montar o header `Authorization` em cada requisição do axios.

### Sobrevivendo ao F5: cookie httpOnly só para restaurar a sessão

Dar F5 não guarda mais o token em nenhum storage lido por JS — em vez
disso, o login também seta um **cookie httpOnly** (`sessao_token`, ver
`backend/app/blueprints/auth.py`), que o JavaScript do frontend nunca lê
diretamente. Ao montar `AuthProvider`, o frontend chama
`GET /auth/sessao`: o backend valida esse cookie no servidor e, se ainda
for uma sessão válida, devolve um novo token para repovoar o `useState`
em memória — mesmo mecanismo do login, só que disparado automaticamente
no carregamento da página em vez de por um formulário.

Isso exige `withCredentials: true` no cliente axios (`api/client.js`) e
`supports_credentials=True` no CORS do backend, com `CORS_ORIGINS`
sempre uma lista explícita de origens (nunca `*`, incompatível com
credentials). Em produção (frontend na Vercel, backend no Render, em
domínios diferentes) o cookie usa `SameSite=None; Secure`; em dev local
(`:5173`/`:8000`, mesmo host `localhost`) usa `SameSite=Lax` sem
`Secure`, já que não há HTTPS — ver `COOKIE_SECURE`/`COOKIE_SAMESITE`
em `backend/app/config.py`.

Se o cookie estiver ausente/expirado/revogado, `GET /auth/sessao`
responde 401 e o usuário segue deslogado normalmente — esse é o caminho
mais comum (primeiro acesso, sessão expirada, logout explícito).
Enquanto essa checagem inicial está em andamento, `AuthContext.carregando`
fica `true` e `ProtectedRoute`/`PublicRoute` não renderizam nada, pra
evitar um flash da tela de login antes da sessão ser restaurada.

## Estrutura

```
src/
├── api/           → um arquivo por área da API (publico, auth, consultor, admin) + client.js (axios)
├── context/        → AuthContext (sessão) e PreferencesContext (fonte/contraste — adicionado, não estava na lista original)
├── routes/          → PublicRoute (foge de /login se já autenticado) e ProtectedRoute (bloqueia por papel)
├── pages/            → uma pasta por área: publico/, auth/, consultor/, admin/
├── components/        → layout/, forms/, resultados/, acessibilidade/
├── hooks/               → useAuth, usePreferences
├── styles/               → tokens.css (variáveis de tema), global.css (reset), tabela.module.css (tabelas admin)
└── utils/resultados.js   → classifica cada linha de /resultados pelo formato do valor_agregado (ver comentário no arquivo)
```

Alguns arquivos não estavam na lista original do escopo mas foram
adicionados por necessidade direta de outra regra pedida — cada um tem um
comentário no topo explicando por quê: `PreferencesContext.jsx`,
`hooks/usePreferences.js`, `pages/publico/PublicFlowLayout.jsx`,
`pages/admin/AdminLayout.jsx`, `components/forms/Button.jsx`,
`utils/resultados.js`.

## Decisões/limitações conhecidas

- **TCLE condicional (regra 3):** `TclePage.jsx` só renderiza o termo de
  consentimento se `instituicao.tcle_obrigatorio` vier `true` da API. O
  backend atual ainda não implementa esse campo (pendente de decisão
  sobre comitê de ética — `docs/09-roadmap-e-pendencias.md`), então hoje
  essa tela nunca aparece de fato — mas a rota `/tcle` já existe e o
  código já está pronto para o dia em que o backend passar a enviar essa
  flag, sem precisar redesenhar as rotas.
- **Identificação de instrumento nos resultados:** `GET /resultados`
  (docs/07) devolve linhas com `dominio_id` numérico, sem nome do domínio
  nem do instrumento. `src/utils/resultados.js` infere o tipo de cada
  linha (Karasek geral / Karasek por domínio / COPSOQ / indisponível)
  pelo **formato** do `valor_agregado` retornado, documentado em
  detalhe naquele arquivo. Como consequência, `CopsoqDominioBadge.jsx`
  identifica o domínio como "Domínio #`id`" (sem nome) — nomear os
  domínios exigiria uma rota nova no backend, fora do escopo desta etapa.
- **Regra condicional de item:** convenção simples e só interpretada no
  frontend (o backend guarda `regra_condicional` como JSON livre, sem
  validar formato): `{ "dependeDoItem": <item_id>, "valorEsperado": <valor> }`
  — o item só é exibido (e só é enviado no payload) se a resposta ao item
  referenciado for igual a `valorEsperado`. Ver `QuestionarioPage.jsx`.
- **IA:** os toggles em `ConfiguracoesPage.jsx` só gravam a preferência
  via `PUT /admin/configuracoes` — não existe nenhuma chamada real a LLM
  em nenhuma tela, propositalmente (fora do escopo desta etapa).

## Rodando localmente (dentro do devcontainer)

Com o backend já rodando (`backend/README.md`) e `frontend/.env` já
criado a partir do `.env.example`:

```bash
cd frontend
npm install
npm run dev
```

Abre em `http://localhost:5173`. `VITE_API_BASE_URL` (em
`frontend/.env`) deve apontar para a raiz do backend (ex.:
`http://localhost:8000`) — o prefixo `/api/v1` é adicionado
automaticamente em `src/api/client.js`.

```bash
npm run build     # build de produção em dist/
npm run preview   # serve o build localmente
npm run lint       # ESLint (react, react-hooks, jsx-a11y)
npm test            # testes de integração com a API (ver abaixo)
```

## Testes de integração com a API

`src/api/conectividade.test.js` (Vitest) chama a API **de verdade** —
sem mocks — para confirmar que o frontend está se comunicando com o
backend: lista instituições (rota pública), faz login com credenciais
erradas e certas, confirma que uma rota protegida rejeita sem token
(401) e aceita com o token retornado pelo login. Por isso precisa do
backend rodando antes:

```bash
# em outro terminal
cd backend && flask db upgrade && flask bootstrap-admin && python run.py

# aqui
cd frontend && npm test
```

Se o backend não estiver no ar, o teste falha logo no início com uma
mensagem clara (não um erro de rede genérico) apontando para
`backend/README.md`. As credenciais usadas são as de bootstrap padrão de
`backend/.env.example` — ajuste no topo do arquivo de teste se o seu
`backend/.env` usa outras.

## Deploy em produção

Build estático (Vite) na **Vercel**, configurando `VITE_API_BASE_URL`
como variável de ambiente do projeto na Vercel, apontando para o backend
publicado no Render.
