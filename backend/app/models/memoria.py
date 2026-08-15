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
