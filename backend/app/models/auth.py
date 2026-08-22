# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

from datetime import datetime, timezone

from app.extensions import db

# Bind "auth" (SQLALCHEMY_BINDS["auth"] = DATABASE_URL_AUTH) — engine
# fisicamente separada do banco anônimo, ver app/extensions.py.
#
# Nenhuma coluna aqui pode ser uma foreign key real para o banco anônimo:
# `instituicao_id`, onde aparece, é apenas um identificador lógico
# (replicado do banco anônimo) resolvido em uma segunda consulta na camada
# de serviço — nunca um db.ForeignKey (docs/03, docs/05).


def _agora():
    return datetime.now(timezone.utc)


PAPEL_CONSULTOR = "consultor"
PAPEL_ADMINISTRADOR = "administrador"
PAPEIS_VALIDOS = (PAPEL_CONSULTOR, PAPEL_ADMINISTRADOR)


class Usuario(db.Model):
    __bind_key__ = "auth"
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    senha_hash = db.Column(db.String(255), nullable=False)
    papel = db.Column(db.String(20), nullable=False)
    ativo = db.Column(db.Boolean, nullable=False, default=True)
    criado_em = db.Column(db.DateTime(timezone=True), nullable=False, default=_agora)


class ConsultorInstituicao(db.Model):
    __bind_key__ = "auth"
    __tablename__ = "consultor_instituicao"

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(
        db.Integer, db.ForeignKey("usuarios.id"), nullable=False, index=True
    )
    # Identificador lógico do banco anônimo — nunca FK real (docs/03).
    instituicao_id = db.Column(db.Integer, nullable=False, index=True)
    criado_em = db.Column(db.DateTime(timezone=True), nullable=False, default=_agora)

    __table_args__ = (
        db.UniqueConstraint(
            "usuario_id", "instituicao_id", name="uq_consultor_instituicao"
        ),
    )


class SessaoLogin(db.Model):
    __bind_key__ = "auth"
    __tablename__ = "sessao_login"

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(
        db.Integer, db.ForeignKey("usuarios.id"), nullable=False, index=True
    )
    token = db.Column(db.String(128), nullable=False, unique=True, index=True)
    criado_em = db.Column(db.DateTime(timezone=True), nullable=False, default=_agora)
    expira_em = db.Column(db.DateTime(timezone=True), nullable=False)
    ip = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    revogado_em = db.Column(db.DateTime(timezone=True), nullable=True)


class LogAtividade(db.Model):
    __bind_key__ = "auth"
    __tablename__ = "log_atividade"

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(
        db.Integer, db.ForeignKey("usuarios.id"), nullable=True, index=True
    )
    acao = db.Column(db.String(100), nullable=False)
    entidade = db.Column(db.String(100), nullable=True)
    entidade_id = db.Column(db.Integer, nullable=True)
    detalhes = db.Column(db.JSON, nullable=True)
    criado_em = db.Column(
        db.DateTime(timezone=True), nullable=False, default=_agora, index=True
    )


class MensagemChat(db.Model):
    """Histórico do chat de ajuda contextual, por usuário (Consultor ou
    Administrador) — ver app/services/chat_ia.py."""

    __bind_key__ = "auth"
    __tablename__ = "mensagens_chat"

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(
        db.Integer, db.ForeignKey("usuarios.id"), nullable=False, index=True
    )
    papel = db.Column(db.String(20), nullable=False)  # "usuario" | "assistente"
    conteudo = db.Column(db.Text, nullable=False)
    criado_em = db.Column(
        db.DateTime(timezone=True), nullable=False, default=_agora, index=True
    )
