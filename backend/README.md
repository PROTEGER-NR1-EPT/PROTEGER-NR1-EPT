# PROTEGER-NR1 EPT — Backend

API Flask do PROTEGER-NR1 EPT. Ver `docs/` na raiz do repositório para o
contexto completo (arquitetura, modelo de dados, regras de negócio).

## Stack

- Python 3.11+, Flask, Gunicorn (produção) / Flask dev server (local)
- SQLAlchemy (Flask-SQLAlchemy) + Flask-Migrate (Alembic) para migrations
- Autenticação por token de sessão opaco, persistido em `sessao_login`
  (ver comentário em `app/auth/security.py` para a justificativa da escolha)
- bcrypt para hash de senha
- flask-cors, com origens configuráveis via `CORS_ORIGINS`
- **flask-openapi3 + Scalar** para documentação interativa da API (ver seção
  própria abaixo)

## Documentação interativa da API (Scalar)

Com o servidor rodando localmente, a documentação fica em:

- **UI (Scalar):** http://localhost:8000/docs/scalar
- **Spec OpenAPI (JSON):** http://localhost:8000/docs/openapi.json

`app` (em `app/__init__.py`) é uma instância de `flask_openapi3.OpenAPI`, uma
subclasse de `Flask` — o resto do app (extensões, error handlers, CLI)
funciona exatamente como em um Flask comum. O que muda é que cada rota
declara seus parâmetros (`path`/`query`/`body`) e respostas possíveis via
modelos **Pydantic**, definidos em `app/schemas/` (um arquivo por
blueprint: `comuns.py`, `publico.py`, `auth.py`, `consultor.py`,
`admin.py`). A biblioteca usa esses modelos tanto para gerar o spec quanto
para **validar automaticamente** a requisição antes da rota rodar.

Pontos importantes sobre como isso foi integrado sem alterar o
comportamento das rotas já existentes:

- **Validação é aditiva, não substitui as regras de negócio.** Os modelos
  Pydantic pegam erros de forma (campo ausente, tipo errado) antes mesmo da
  função da rota rodar; toda regra de negócio (ex.: "instituição existe e
  está ativa", "e-mail já cadastrado", "threshold >= 1") continua
  implementada à mão dentro da rota, exatamente como antes.
- **Mesmo formato de erro em toda a API.** Por padrão, uma falha de
  validação do Pydantic retornaria HTTP 422 num formato próprio da
  biblioteca. Isso foi sobrescrito (`validation_error_status` +
  `validation_error_callback` em `app/__init__.py`) para reaproveitar o
  formato `{"erro", "mensagem", "detalhes"}` já usado por
  `app/blueprints/__init__.py:erro_json` — quem consome a API vê um único
  contrato de erro, não dois.
- **Resposta documentada, não validada em runtime.** `responses={200: X}`
  em cada rota é só para o spec — por padrão `validate_response` está
  desligado, então o retorno de cada view function continua sendo o
  `dict`/`list` já testado, sem nenhuma coerção adicional.
- **`Authorization: Bearer <token>` continua funcionando exatamente igual.**
  A validação/leitura do token continua feita à mão pelos decorators
  `@login_required`/`@requer_papel(...)` (`app/auth/decorators.py`); o
  `security_schemes`/`security=[...]` do flask-openapi3 é só para a
  documentação mostrar o cadeado e permitir testar direto pela UI (botão
  **Authorize** no Scalar) — não é ele quem bloqueia a requisição.

## Instalação

```bash
pip install -r requirements.txt
```

Isso instala, entre outras, `flask-openapi3==4.3.2`, `flask-openapi3-scalar`
(o pacote que fornece o template estático do Scalar — servido pelo próprio
Flask, sem depender de nenhum CDN externo) e `pydantic==2.13.4`.

## Três bancos, uma engine por banco

O sistema usa três bancos Postgres fisicamente separados
(`DATABASE_URL_ANONIMO`, `DATABASE_URL_AUTH`, `DATABASE_URL_MEMORIA`), sem
nenhuma foreign key real entre eles.

**Nota de implementação:** o pedido original era três *instâncias* de
`SQLAlchemy`, uma por banco. Isso não é possível com Flask-SQLAlchemy 3.x —
`init_app()` recusa registrar uma segunda instância no mesmo app Flask. A
alternativa usada aqui, e suportada nativamente pelo Flask-SQLAlchemy /
Flask-Migrate, é `SQLALCHEMY_BINDS`: uma única instância `db`, mas com uma
**engine (pool de conexão) fisicamente separada por bind key** — nunca uma
engine compartilhada entre bancos. Isso foi verificado na prática antes de
implementar (cada bind aponta para um Postgres diferente e não enxerga as
tabelas dos outros). Ver comentário completo em `app/extensions.py`.

## Estrutura

```
app/
├── __init__.py          → application factory (create_app)
├── config.py             → variáveis de ambiente
├── extensions.py         → db (SQLAlchemy + binds), migrate, cors
├── models/
│   ├── anonimo.py        → bind padrão (banco anônimo)
│   ├── auth.py            → bind "auth"
│   └── memoria.py         → bind "memoria"
├── blueprints/
│   ├── publico.py         → sem autenticação
│   ├── auth.py             → login/logout
│   ├── consultor.py        → papel "consultor"
│   └── admin.py             → papel "administrador"
├── schemas/                 → modelos Pydantic para o OpenAPI/Scalar (um arquivo por blueprint)
│   ├── comuns.py             → ErroResponse e outros compartilhados
│   ├── publico.py
│   ├── auth.py
│   ├── consultor.py
│   └── admin.py
├── services/
│   ├── k_anonimato.py      → único ponto de leitura de resultado agregado
│   ├── instrumentos/        → strategy pattern (karasek.py, copsoq.py)
│   └── exportacao.py        → exportação CSV com log de auditoria
├── auth/
│   ├── security.py          → hash de senha, geração de token
│   └── decorators.py         → @login_required, @requer_papel(...)
├── bootstrap.py               → criação idempotente do 1º Administrador
└── seed.py                     → massa de dados fictícia p/ dev (flask seed-dev-data / seed-questionario-misto)
```

## Rodando localmente (dentro do devcontainer)

Os três bancos (`anonimo_db`, `auth_db`, `memoria_db`) já sobem
automaticamente via `docker-compose` ao abrir o devcontainer, e
`backend/.env` já é criado a partir de `backend/.env.example`.

```bash
cd backend
pip install -r requirements.txt

export FLASK_APP=wsgi.py

# aplica as migrations nos 3 bancos de uma vez (Flask-Migrate --multidb)
flask db upgrade

# cria o primeiro Administrador (idempotente — não duplica se já existir)
flask bootstrap-admin

# opcional: popula os 3 bancos com uma massa de dados fictícia para
# testar o sistema manualmente (instituições, questionários — Karasek,
# COPSOQ e um misto —, respostas já cobrindo grupos acima/abaixo do
# threshold de k-anonimato, Consultores de teste, memória institucional)
# — idempotente, só roda com FLASK_ENV=development. Ver app/seed.py para
# o que exatamente é criado.
flask seed-dev-data

# opcional: se `seed-dev-data` já tinha rodado antes de o questionário
# misto existir, este comando complementa só essa parte (idempotente pelo
# título do questionário, não apaga/altera nada já existente).
flask seed-questionario-misto

# roda o servidor de desenvolvimento em http://localhost:8000
python run.py
```

## Gerando novas migrations

Sempre que um modelo mudar, gere e revise a migration antes de aplicar:

```bash
flask db migrate -m "descrição da mudança"
flask db upgrade
```

Como o projeto usa `--multidb`, uma única revisão cobre os três bancos —
o Flask-Migrate detecta sozinho, por `__bind_key__`, em qual banco cada
tabela deve ser criada/alterada.

## Rodando os testes

```bash
pytest
```

Cobrem os pontos mais sensíveis do sistema: aplicação de k-anonimato
(`tests/test_k_anonimato.py`) e cálculo dos instrumentos
(`tests/test_karasek.py`, `tests/test_copsoq.py`).

## Produção (Render)

Servido via Gunicorn, apontando para `wsgi:app`:

```bash
gunicorn wsgi:app
```

As migrations (`flask db upgrade`) e o bootstrap do Administrador
(`flask bootstrap-admin`) devem ser executados manualmente (ou via um
passo de deploy do Render) após o primeiro deploy — nunca automaticamente
a cada boot do servidor.

## Decisões e simplificações do MVP

- **Cada instituição escolhe o questionário que usa** via
  `instituicoes.questionario_id` (nullable) — vários questionários podem
  estar `ativo=true` (disponíveis para vínculo) ao mesmo tempo, sem
  exclusividade entre eles (ver `docs/03-modelo-de-dados.md` e
  `admin.py`). Um questionário pode ser **misto**: `dominios.instrumento`
  vive no domínio, não no questionário, então um único questionário pode
  combinar domínios de instrumentos diferentes (ex.: Karasek + COPSOQ) —
  `services/k_anonimato.py:recalcular_resultados` agrupa por instrumento e
  une os resultados. `Questionario.modo_apresentacao` (`blocos`/
  `intercalado`) decide a ordem final dos itens entregues ao respondente
  (`blueprints/publico.py:_montar_itens_em_ordem`), sem nunca revelar
  domínio/instrumento.
- **`resultados_agregados` usa um único período** (`periodo="consolidado"`),
  recalculado a cada nova resposta. Suporte a períodos reais (ex.: por
  semestre) é extensão futura que não exige mudança de schema.
- **Threshold de k-anonimato e toggles de IA** vivem em
  `configuracoes_sistema` (banco anônimo, linha única) — nunca lidos de
  variável de ambiente em runtime; os valores em `.env` só alimentam essa
  linha na primeira vez que ela é criada.
- **Nenhuma integração real de LLM** foi implementada — os campos de
  configuração existem, mas nenhuma rota chama um provedor de IA (fora de
  escopo desta etapa).
- **TCLE não implementado** — pendente de decisão sobre exigência de
  comitê de ética (`docs/09-roadmap-e-pendencias.md`).
