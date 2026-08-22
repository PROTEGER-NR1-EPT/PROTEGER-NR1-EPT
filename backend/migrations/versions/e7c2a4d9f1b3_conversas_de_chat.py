"""conversas de chat

Revision ID: e7c2a4d9f1b3
Revises: c3a9f1d6b8e2
Create Date: 2026-08-22 00:00:00.000000

Introduz conversas_chat (bind auth), agrupando mensagens_chat em threads
distintas em vez de um log único por usuário. Faz backfill dos dados já
existentes: cada usuario_id que já tinha mensagens ganha exatamente 1
conversa contendo todo o histórico antigo dele.

Nota sobre downgrade: é "lossy" na estrutura (a fronteira entre conversas
se perde — tudo volta a ser um log único por usuário), mas nenhuma
mensagem é apagada.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e7c2a4d9f1b3'
down_revision = 'c3a9f1d6b8e2'
branch_labels = None
depends_on = None


def upgrade(engine_name):
    globals()["upgrade_%s" % engine_name]()


def downgrade(engine_name):
    globals()["downgrade_%s" % engine_name]()


def upgrade_():
    pass


def downgrade_():
    pass


def upgrade_auth():
    op.create_table(
        'conversas_chat',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('titulo', sa.String(length=80), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('conversas_chat', schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f('ix_conversas_chat_usuario_id'), ['usuario_id'], unique=False
        )
        batch_op.create_index(
            batch_op.f('ix_conversas_chat_atualizado_em'), ['atualizado_em'], unique=False
        )

    # Backfill: 1 conversa por usuario_id já presente em mensagens_chat,
    # com criado_em/atualizado_em = intervalo real das mensagens antigas.
    op.execute(
        "INSERT INTO conversas_chat (usuario_id, criado_em, atualizado_em) "
        "SELECT usuario_id, MIN(criado_em), MAX(criado_em) "
        "FROM mensagens_chat GROUP BY usuario_id"
    )
    # Título retroativo = primeiros 50 caracteres da 1ª mensagem "usuario"
    # de cada pessoa (mesmo corte de _gerar_titulo em services/chat_ia.py).
    op.execute(
        "UPDATE conversas_chat SET titulo = sub.titulo FROM ("
        "  SELECT DISTINCT ON (m.usuario_id) m.usuario_id, "
        "  LEFT(regexp_replace(m.conteudo, '\\s+', ' ', 'g'), 50) AS titulo "
        "  FROM mensagens_chat m WHERE m.papel = 'usuario' "
        "  ORDER BY m.usuario_id, m.criado_em ASC"
        ") AS sub WHERE conversas_chat.usuario_id = sub.usuario_id"
    )

    # conversa_id nullable primeiro (backfill ainda precisa rodar antes do
    # NOT NULL), depois preenchido, só então travado.
    op.add_column('mensagens_chat', sa.Column('conversa_id', sa.Integer(), nullable=True))
    op.execute(
        "UPDATE mensagens_chat SET conversa_id = conversas_chat.id "
        "FROM conversas_chat WHERE conversas_chat.usuario_id = mensagens_chat.usuario_id"
    )
    with op.batch_alter_table('mensagens_chat', schema=None) as batch_op:
        batch_op.alter_column('conversa_id', existing_type=sa.Integer(), nullable=False)
        batch_op.create_foreign_key(
            'fk_mensagens_chat_conversa_id', 'conversas_chat', ['conversa_id'], ['id'],
            ondelete='CASCADE',
        )
        batch_op.create_index(
            batch_op.f('ix_mensagens_chat_conversa_id'), ['conversa_id'], unique=False
        )


def downgrade_auth():
    with op.batch_alter_table('mensagens_chat', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_mensagens_chat_conversa_id'))
        batch_op.drop_constraint('fk_mensagens_chat_conversa_id', type_='foreignkey')
    op.drop_column('mensagens_chat', 'conversa_id')

    with op.batch_alter_table('conversas_chat', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_conversas_chat_atualizado_em'))
        batch_op.drop_index(batch_op.f('ix_conversas_chat_usuario_id'))
    op.drop_table('conversas_chat')


def upgrade_memoria():
    pass


def downgrade_memoria():
    pass
