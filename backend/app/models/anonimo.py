# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

from datetime import datetime, timezone

from app.extensions import db

# Bind padrão (SQLALCHEMY_DATABASE_URI = DATABASE_URL_ANONIMO) — ver
# app/extensions.py e app/__init__.py. Nenhum modelo deste arquivo pode ter
# coluna que identifique pessoa física (nome, e-mail, IP, user agent,
# matrícula) — regra de negócio inegociável (docs/05).


def _agora():
    return datetime.now(timezone.utc)


class Instituicao(db.Model):
    __tablename__ = "instituicoes"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    uf = db.Column(db.String(2), nullable=True)
    municipio = db.Column(db.String(255), nullable=True)
    ativo = db.Column(db.Boolean, nullable=False, default=True)
    # Qual questionário esta instituição usa no fluxo público (GET
    # /questionarios/ativo) — substitui a antiga regra de "só existe um
    # questionário ativo no sistema todo". Nulo = nenhum vinculado ainda.
    questionario_id = db.Column(
        db.Integer, db.ForeignKey("questionarios.id"), nullable=True, index=True
    )
    criado_em = db.Column(db.DateTime(timezone=True), nullable=False, default=_agora)


class Setor(db.Model):
    __tablename__ = "setores"

    id = db.Column(db.Integer, primary_key=True)
    instituicao_id = db.Column(
        db.Integer, db.ForeignKey("instituicoes.id"), nullable=False, index=True
    )
    nome = db.Column(db.String(255), nullable=False)
    ativo = db.Column(db.Boolean, nullable=False, default=True)
    criado_em = db.Column(db.DateTime(timezone=True), nullable=False, default=_agora)


class Questionario(db.Model):
    __tablename__ = "questionarios"

    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(255), nullable=False)
    versao = db.Column(db.String(20), nullable=False, default="1.0")
    # "Disponível para ser vinculado a uma instituição" — não há mais
    # exclusividade entre questionários (docs/03): vários podem estar
    # ativos ao mesmo tempo, cada instituição escolhe o seu
    # (Instituicao.questionario_id).
    ativo = db.Column(db.Boolean, nullable=False, default=True)
    # "blocos": itens agrupados por domínio, na ordem cadastrada.
    # "intercalado": itens de domínios diferentes alternados (round-robin) —
    # ver app/blueprints/publico.py:_montar_itens_em_ordem. Usado para
    # questionários mistos (Karasek + COPSOQ no mesmo formulário) decidirem
    # como apresentar os itens sem revelar ao respondente que são "duas
    # partes".
    modo_apresentacao = db.Column(db.String(20), nullable=False, default="blocos")
    criado_em = db.Column(db.DateTime(timezone=True), nullable=False, default=_agora)

    dominios = db.relationship(
        "Dominio", backref="questionario", order_by="Dominio.ordem", lazy="selectin"
    )


class Dominio(db.Model):
    __tablename__ = "dominios"

    id = db.Column(db.Integer, primary_key=True)
    questionario_id = db.Column(
        db.Integer, db.ForeignKey("questionarios.id"), nullable=False, index=True
    )
    nome = db.Column(db.String(255), nullable=False)
    # Chave usada pelas estratégias de cálculo (ex.: "demanda", "controle"
    # no Karasek; um slug por domínio no COPSOQ) — ver services/instrumentos.
    chave = db.Column(db.String(50), nullable=False)
    # Chave do strategy plugável em services/instrumentos (ex.: "karasek",
    # "copsoq") — vive no domínio (não no questionário) para permitir
    # questionários mistos, combinando domínios de instrumentos diferentes
    # no mesmo formulário. String livre (não Enum de banco) para permitir
    # novos instrumentos sem migration, conforme docs/06.
    instrumento = db.Column(db.String(50), nullable=False)
    ordem = db.Column(db.Integer, nullable=False, default=0)

    itens = db.relationship(
        "Item", backref="dominio", order_by="Item.ordem", lazy="selectin"
    )


class Item(db.Model):
    __tablename__ = "itens"

    id = db.Column(db.Integer, primary_key=True)
    dominio_id = db.Column(
        db.Integer, db.ForeignKey("dominios.id"), nullable=False, index=True
    )
    texto = db.Column(db.Text, nullable=False)
    tipo_resposta = db.Column(db.String(30), nullable=False, default="escala_likert")
    ordem = db.Column(db.Integer, nullable=False, default=0)
    escala_min = db.Column(db.Integer, nullable=False, default=1)
    escala_max = db.Column(db.Integer, nullable=False, default=5)
    # Item de pontuação invertida (reverse-scored) — usado no cálculo do
    # escore do domínio (ver services/instrumentos).
    invertido = db.Column(db.Boolean, nullable=False, default=False)
    regra_condicional = db.Column(db.JSON, nullable=True)


class RespostaBruta(db.Model):
    __tablename__ = "respostas_brutas"

    id = db.Column(db.Integer, primary_key=True)
    questionario_id = db.Column(
        db.Integer, db.ForeignKey("questionarios.id"), nullable=False, index=True
    )
    instituicao_id = db.Column(
        db.Integer, db.ForeignKey("instituicoes.id"), nullable=False, index=True
    )
    setor_id = db.Column(
        db.Integer, db.ForeignKey("setores.id"), nullable=False, index=True
    )
    respondido_em = db.Column(
        db.DateTime(timezone=True), nullable=False, default=_agora
    )
    # {item_id: valor} — nenhum campo identificador de pessoa física.
    payload_json = db.Column(db.JSON, nullable=False)


class ResultadoAgregado(db.Model):
    __tablename__ = "resultados_agregados"

    id = db.Column(db.Integer, primary_key=True)
    instituicao_id = db.Column(
        db.Integer, db.ForeignKey("instituicoes.id"), nullable=False, index=True
    )
    setor_id = db.Column(
        db.Integer, db.ForeignKey("setores.id"), nullable=False, index=True
    )
    questionario_id = db.Column(
        db.Integer, db.ForeignKey("questionarios.id"), nullable=False, index=True
    )
    # Nulo quando o valor agregado é do questionário como um todo (ex.:
    # quadrante do Karasek, que cruza dois domínios); preenchido quando é
    # um escore por domínio (ex.: escore 0-100 do COPSOQ).
    dominio_id = db.Column(db.Integer, db.ForeignKey("dominios.id"), nullable=True)
    # Simplificação do MVP: um único período contínuo ("consolidado").
    # Suporte a períodos reais (ex.: por semestre) é extensão futura que
    # não altera a estrutura desta tabela.
    periodo = db.Column(db.String(30), nullable=False, default="consolidado")
    valor_agregado = db.Column(db.JSON, nullable=True)
    n_respostas = db.Column(db.Integer, nullable=False, default=0)
    calculado_em = db.Column(
        db.DateTime(timezone=True), nullable=False, default=_agora, onupdate=_agora
    )

    __table_args__ = (
        db.Index(
            "ix_resultados_agregados_grupo",
            "instituicao_id",
            "setor_id",
            "questionario_id",
            "dominio_id",
            "periodo",
        ),
    )


class ConfiguracaoSistema(db.Model):
    """Linha única (singleton, id=1) de configuração do sistema.

    Guarda o threshold de k-anonimato e os toggles/credenciais de IA — nunca
    lidos de variável de ambiente em runtime, apenas usados como valor de
    fábrica na criação desta linha (ver services/k_anonimato.py e
    app/bootstrap.py). Vive no banco anônimo porque é o banco cujas
    leituras (resultados_agregados) o threshold protege, e as três
    funcionalidades de IA (sugestão de questionário, análise de resultados,
    chat) também operam sobre dados deste banco.
    """

    __tablename__ = "configuracoes_sistema"

    id = db.Column(db.Integer, primary_key=True)
    k_anonimato_threshold = db.Column(db.Integer, nullable=False, default=5)

    ia_sugestao_questionario_enabled = db.Column(
        db.Boolean, nullable=False, default=False
    )
    ia_analise_resultados_enabled = db.Column(
        db.Boolean, nullable=False, default=False
    )
    ia_chat_enabled = db.Column(db.Boolean, nullable=False, default=False)

    llm_provider = db.Column(db.String(30), nullable=True)
    llm_api_key = db.Column(db.String(255), nullable=True)
    llm_base_url = db.Column(db.String(255), nullable=True)
    llm_model = db.Column(db.String(100), nullable=True)

    atualizado_em = db.Column(
        db.DateTime(timezone=True), nullable=False, default=_agora, onupdate=_agora
    )
