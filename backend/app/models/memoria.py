from datetime import datetime, timezone

from app.extensions import db

# Bind "memoria" (SQLALCHEMY_BINDS["memoria"] = DATABASE_URL_MEMORIA) —
# engine fisicamente separada dos bancos anônimo e de autenticação.
#
# `instituicao_id` e `criado_por_usuario_id` são identificadores lógicos
# replicados de outros bancos — nunca db.ForeignKey (docs/03, docs/05).


def _agora():
    return datetime.now(timezone.utc)


class InstituicaoReferencia(db.Model):
    """Espelho leve do cadastro de instituições (banco anônimo), para a
    tela de memória institucional não depender de consulta cross-bank em
    tempo real."""

    __bind_key__ = "memoria"
    __tablename__ = "instituicoes_referencia"

    id = db.Column(db.Integer, primary_key=True)
    instituicao_id = db.Column(db.Integer, nullable=False, unique=True, index=True)
    nome = db.Column(db.String(255), nullable=False)
    atualizado_em = db.Column(
        db.DateTime(timezone=True), nullable=False, default=_agora, onupdate=_agora
    )


class RegistroMemoria(db.Model):
    __bind_key__ = "memoria"
    __tablename__ = "registros_memoria"

    id = db.Column(db.Integer, primary_key=True)
    instituicao_id = db.Column(db.Integer, nullable=False, index=True)
    tipo = db.Column(db.String(50), nullable=False)
    titulo = db.Column(db.String(255), nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    anexo_url = db.Column(db.String(500), nullable=True)
    # Identificador lógico do usuário (banco auth) que criou o registro.
    criado_por_usuario_id = db.Column(db.Integer, nullable=True)
    criado_em = db.Column(db.DateTime(timezone=True), nullable=False, default=_agora)


class LinhaDoTempo(db.Model):
    __bind_key__ = "memoria"
    __tablename__ = "linha_do_tempo"

    id = db.Column(db.Integer, primary_key=True)
    instituicao_id = db.Column(db.Integer, nullable=False, index=True)
    evento = db.Column(db.String(255), nullable=False)
    data_evento = db.Column(db.Date, nullable=False)
    # FK real: mesma base (memoria_db).
    registro_memoria_id = db.Column(
        db.Integer, db.ForeignKey("registros_memoria.id"), nullable=True
    )
    criado_em = db.Column(db.DateTime(timezone=True), nullable=False, default=_agora)


# ---------------------------------------------------------------------------
# Planos de Ação — vinculados a uma instituição (identificador lógico, nunca
# FK cross-bank) e organizados por ciclo. Diferente de RegistroMemoria (nota
# de texto livre), aqui o objetivo é acompanhamento estruturado: status,
# prazo, checklist de tarefas e dependências entre ações. `responsavel` e
# `participantes` são texto livre (nome digitado) — o sistema não tem
# cadastro de "pessoa da instituição" (só Consultor/Administrador têm
# login, ver models/auth.py), então não há registro para referenciar.
# `anexos` é uma lista de links externos (mesmo padrão de
# RegistroMemoria.anexo_url) — não há upload de arquivo real no projeto.
# ---------------------------------------------------------------------------


class PlanoAcao(db.Model):
    __bind_key__ = "memoria"
    __tablename__ = "planos_acao"

    id = db.Column(db.Integer, primary_key=True)
    instituicao_id = db.Column(db.Integer, nullable=False, index=True)
    ciclo = db.Column(db.String(50), nullable=False)
    criado_por_usuario_id = db.Column(db.Integer, nullable=True)
    criado_em = db.Column(db.DateTime(timezone=True), nullable=False, default=_agora)

    acoes = db.relationship(
        "AcaoPlano", backref="plano", order_by="AcaoPlano.ordem", lazy="selectin"
    )


STATUS_ACAO_VALIDOS = ("pendente", "em_andamento", "concluido")


class AcaoPlano(db.Model):
    __bind_key__ = "memoria"
    __tablename__ = "acoes_plano"

    id = db.Column(db.Integer, primary_key=True)
    plano_id = db.Column(db.Integer, db.ForeignKey("planos_acao.id"), nullable=False, index=True)
    titulo = db.Column(db.String(255), nullable=False)
    # Categoria/dimensão livre (ex.: "Estresse", "Liderança") — usada tanto
    # para o chip colorido na UI quanto pela geração automática de
    # sugestões (uma ação por dimensão em risco alto/crítico).
    tag = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="pendente")
    prazo = db.Column(db.Date, nullable=True)
    responsavel = db.Column(db.String(255), nullable=True)
    participantes = db.Column(db.JSON, nullable=True)  # lista de strings
    anexos = db.Column(db.JSON, nullable=True)  # lista de {titulo, url}
    descricao = db.Column(db.Text, nullable=True)
    # Posição dentro da coluna/status no Kanban.
    ordem = db.Column(db.Integer, nullable=False, default=0)
    criado_em = db.Column(db.DateTime(timezone=True), nullable=False, default=_agora)
    atualizado_em = db.Column(
        db.DateTime(timezone=True), nullable=False, default=_agora, onupdate=_agora
    )

    tarefas = db.relationship(
        "TarefaAcao", backref="acao", order_by="TarefaAcao.ordem", lazy="selectin"
    )


class TarefaAcao(db.Model):
    __bind_key__ = "memoria"
    __tablename__ = "tarefas_acao"

    id = db.Column(db.Integer, primary_key=True)
    acao_id = db.Column(db.Integer, db.ForeignKey("acoes_plano.id"), nullable=False, index=True)
    titulo = db.Column(db.String(255), nullable=False)
    concluida = db.Column(db.Boolean, nullable=False, default=False)
    ordem = db.Column(db.Integer, nullable=False, default=0)


class DependenciaAcao(db.Model):
    """`acao_id` depende de `depende_de_acao_id` — a leitura invertida
    (`depende_de_acao_id` "bloqueia" `acao_id`) é calculada na serialização,
    sem coluna/tabela extra."""

    __bind_key__ = "memoria"
    __tablename__ = "dependencias_acao"

    id = db.Column(db.Integer, primary_key=True)
    acao_id = db.Column(db.Integer, db.ForeignKey("acoes_plano.id"), nullable=False, index=True)
    depende_de_acao_id = db.Column(
        db.Integer, db.ForeignKey("acoes_plano.id"), nullable=False, index=True
    )

    __table_args__ = (
        db.UniqueConstraint("acao_id", "depende_de_acao_id", name="uq_dependencia_acao"),
    )
