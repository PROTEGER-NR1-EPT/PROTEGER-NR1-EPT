from flask_openapi3 import Info, OpenAPI
from flask_openapi3.models.security_scheme import SecurityScheme

from app.blueprints import erro_json
from app.config import Config
from app.extensions import cors, db, migrate

DESCRICAO_API = """
API do **PROTEGER-NR1 EPT** — sistema de identificação, registro e prevenção
de riscos psicossociais (NR-1) em instituições de Educação Profissional e
Tecnológica, usando os instrumentos **Karasek Demand-Control** e **COPSOQ**.

Ver a pasta `docs/` na raiz do repositório para o contexto completo do
produto; esta página documenta apenas o contrato da API.

## Papéis e autenticação

| Papel | Autenticação | Escopo |
|---|---|---|
| **Usuário** (respondente) | nenhuma | rotas com tag *Público* |
| **Consultor** | `Authorization: Bearer <token>` | rotas com tag *Consultor* — apenas instituições vinculadas |
| **Administrador** | `Authorization: Bearer <token>` | rotas com tag *Administrador* — acesso total |

O token é obtido em `POST /auth/login` e é um **token opaco de sessão**
(não um JWT), validado a cada requisição contra a tabela `sessao_login` —
ver comentário completo em `app/auth/security.py` do código-fonte para a
justificativa dessa escolha. Clique em **Authorize** no topo desta página
para configurar o token uma vez e testar as rotas protegidas diretamente
por aqui.

## Regras que valem para toda a API

- **k-anonimato**: todo resultado agregado (`resultado_disponivel` /
  `valor_agregado` nas respostas de `/resultados`) passa pelo mesmo filtro
  central (`app/services/k_anonimato.py`) — se o grupo tiver menos
  respostas que o threshold configurado, o valor nunca é retornado, mesmo
  que exista internamente.
- **Nenhum identificador pessoal**: o payload de `POST /respostas` nunca
  deve conter nome, e-mail, matrícula ou IP do respondente — é rejeitado
  se contiver qualquer item que não pertença ao questionário.
- **Três bancos fisicamente separados**: não há foreign key real entre o
  banco anônimo (respostas/agregações), o de autenticação (usuários/sessões)
  e o de memória institucional — toda referência cruzada é por ID lógico,
  resolvida em uma segunda consulta na camada de serviço.
- **Erros**: toda resposta de erro (validação automática incluída) segue o
  mesmo formato: `{"erro": "codigo", "mensagem": "...", "detalhes": {}}`.
"""

SECURITY_SCHEMES = {
    "bearerAuth": SecurityScheme(
        type="http",
        scheme="bearer",
        description=(
            "Token opaco retornado por POST /auth/login. Envie como "
            "`Authorization: Bearer <token>`."
        ),
    )
}


def create_app(config_class=Config):
    info = Info(
        title="PROTEGER-NR1 EPT — API",
        version="1.0.0",
        description=DESCRICAO_API,
    )

    # Documentação OpenAPI com suporte a Scalar — ver requirements.txt
    # (flask-openapi3[scalar]) e README do backend. `OpenAPI` é uma
    # subclasse de `Flask`, então todo o resto do app (extensões,
    # blueprints "de verdade", error handlers) continua funcionando como
    # antes; o que muda é que cada rota agora declara seus parâmetros
    # (path/query/body) e respostas via modelos Pydantic, o que a
    # biblioteca usa tanto para gerar o spec quanto para validar a
    # requisição automaticamente.
    app = OpenAPI(
        __name__,
        info=info,
        security_schemes=SECURITY_SCHEMES,
        doc_prefix="/docs",
        validation_error_status=400,
        validation_error_callback=_tratar_erro_de_validacao,
    )
    app.config.from_object(config_class)

    # Bind padrão = banco anônimo; "auth" e "memoria" são engines
    # fisicamente separadas (ver app/extensions.py para a justificativa
    # completa dessa escolha em relação ao pedido original de 3
    # instâncias de SQLAlchemy).
    app.config["SQLALCHEMY_DATABASE_URI"] = config_class.SQLALCHEMY_DATABASE_URI_ANONIMO
    app.config["SQLALCHEMY_BINDS"] = {
        "auth": config_class.SQLALCHEMY_DATABASE_URI_AUTH,
        "memoria": config_class.SQLALCHEMY_DATABASE_URI_MEMORIA,
    }

    db.init_app(app)
    migrate.init_app(app, db)
    # supports_credentials=True: necessário para o cookie httpOnly de
    # restauração de sessão (GET /auth/sessao) trafegar cross-site — exige
    # que CORS_ORIGINS liste origens explícitas (nunca "*", incompatível
    # com credentials) e que o frontend use axios com withCredentials.
    cors.init_app(app, origins=app.config["CORS_ORIGINS"], supports_credentials=True)

    with app.app_context():
        from app import models  # noqa: F401  (registra os modelos nos metadados)

    _registrar_blueprints(app)
    _registrar_tratadores_de_erro(app)
    _registrar_comandos_cli(app)

    return app


def _tratar_erro_de_validacao(e):
    """Converte um pydantic.ValidationError (parâmetros/corpo inválidos)
    para o mesmo formato de erro usado manualmente em toda a API — ver
    app/blueprints/__init__.py:erro_json. Assim, tanto os erros de
    validação levantados à mão quanto os automáticos (gerados pelos
    modelos Pydantic em app/schemas/) têm sempre a mesma forma para quem
    consome a API."""
    detalhes = {
        "erros": [
            {"campo": ".".join(str(parte) for parte in erro["loc"]), "mensagem": erro["msg"]}
            for erro in e.errors()
        ]
    }
    return erro_json("payload_invalido", "Dados inválidos na requisição.", 400, detalhes)


def _registrar_blueprints(app):
    from flask_openapi3 import APIBlueprint

    from app.blueprints.admin import bp as admin_bp
    from app.blueprints.auth import bp as auth_bp
    from app.blueprints.consultor import bp as consultor_bp
    from app.blueprints.planos_acao import bp as planos_acao_bp
    from app.blueprints.publico import bp as publico_bp

    # Blueprint "guarda-chuva" apenas para compor o prefixo /api/v1 com o
    # prefixo próprio de cada blueprint filho (registro aninhado combina
    # os url_prefix; passar url_prefix direto em register_api
    # substituiria, em vez de combinar, o prefixo do blueprint filho).
    api = APIBlueprint("api_v1", __name__, url_prefix="/api/v1")
    api.register_api(publico_bp)
    api.register_api(auth_bp)
    api.register_api(consultor_bp)
    api.register_api(admin_bp)
    # Planos de Ação: blueprint próprio (mesmo url_prefix "/admin") para não
    # deixar admin.py/schemas/admin.py ainda maiores — funcionalidade grande
    # o suficiente para justificar arquivo dedicado.
    api.register_api(planos_acao_bp)
    app.register_api(api)


def _registrar_tratadores_de_erro(app):
    @app.errorhandler(404)
    def nao_encontrado(_e):
        return erro_json("nao_encontrado", "Recurso não encontrado.", 404)

    @app.errorhandler(405)
    def metodo_nao_permitido(_e):
        return erro_json("metodo_nao_permitido", "Método não permitido para esta rota.", 405)

    @app.errorhandler(500)
    def erro_interno(_e):
        return erro_json("erro_interno", "Erro interno do servidor.", 500)


def _registrar_comandos_cli(app):
    @app.cli.command("bootstrap-admin")
    def bootstrap_admin_cmd():
        """Cria o primeiro Administrador a partir de ADMIN_BOOTSTRAP_EMAIL /
        ADMIN_BOOTSTRAP_PASSWORD (idempotente)."""
        from app.bootstrap import bootstrap_admin_inicial

        admin = bootstrap_admin_inicial(
            app.config["ADMIN_BOOTSTRAP_EMAIL"], app.config["ADMIN_BOOTSTRAP_PASSWORD"]
        )
        if admin is None:
            print("Administrador já existia — nenhuma ação necessária.")
        else:
            print(f"Administrador criado: {admin.email}")

    @app.cli.command("seed-dev-data")
    def seed_dev_data_cmd():
        """Popula os 3 bancos com uma massa de dados fictícia para testes
        manuais (instituições, setores, questionários Karasek/COPSOQ,
        respostas, Consultores e memória institucional). Idempotente —
        rodar de novo não duplica. Recusa rodar fora de FLASK_ENV=development
        para nunca poluir um banco de produção por engano."""
        if app.config["FLASK_ENV"] != "development":
            print(
                "Recusado: este comando só roda com FLASK_ENV=development "
                "(configurado atualmente como "
                f"'{app.config['FLASK_ENV']}')."
            )
            return

        from app.seed import (
            NOME_INSTITUICAO_1,
            NOME_INSTITUICAO_2,
            NOME_INSTITUICAO_3,
            SENHA_DEMO,
            seed_dev_data,
        )

        if not seed_dev_data():
            print("Dados de teste já existiam — nenhuma ação necessária.")
            return

        print("Massa de dados de teste criada com sucesso:")
        print(f"  - Instituições: {NOME_INSTITUICAO_1}, {NOME_INSTITUICAO_2}, {NOME_INSTITUICAO_3}")
        print("  - Questionários: um Karasek ativo, um COPSOQ encerrado (inativo)")
        print("  - Respostas cobrindo grupos acima e abaixo do threshold de k-anonimato")
        print(f"  - Consultores de teste (senha para todos: {SENHA_DEMO}):")
        print(f"      consultor.um@exemplo.com   -> {NOME_INSTITUICAO_1}")
        print(f"      consultor.dois@exemplo.com -> {NOME_INSTITUICAO_2}, {NOME_INSTITUICAO_3}")
        print("      consultor.tres@exemplo.com -> todas as instituições")

    @app.cli.command("seed-questionario-misto")
    def seed_questionario_misto_cmd():
        """Cria só o questionário misto de demonstração (Karasek + COPSOQ no
        mesmo formulário) com respostas de teste, sem apagar/alterar nenhum
        dado já existente — útil para quem já tinha rodado `seed-dev-data`
        antes de essa funcionalidade existir. Idempotente pelo título do
        questionário. Recusa rodar fora de FLASK_ENV=development."""
        if app.config["FLASK_ENV"] != "development":
            print(
                "Recusado: este comando só roda com FLASK_ENV=development "
                "(configurado atualmente como "
                f"'{app.config['FLASK_ENV']}')."
            )
            return

        from app.seed import TITULO_QUESTIONARIO_MISTO, seed_questionario_misto_demo

        if not seed_questionario_misto_demo():
            print(f"Questionário '{TITULO_QUESTIONARIO_MISTO}' já existia — nenhuma ação necessária.")
            return

        print(f"Questionário misto de demonstração criado: {TITULO_QUESTIONARIO_MISTO}")
