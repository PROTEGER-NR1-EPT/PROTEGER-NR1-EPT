"""chat de ajuda contextual

Revision ID: c3a9f1d6b8e2
Revises: 50f442d72796
Create Date: 2026-08-22 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3a9f1d6b8e2'
down_revision = '50f442d72796'
branch_labels = None
depends_on = None


def upgrade(engine_name):
    globals()["upgrade_%s" % engine_name]()


def downgrade(engine_name):
    globals()["downgrade_%s" % engine_name]()


def upgrade_():
    op.add_column(
        'configuracoes_sistema', sa.Column('llm_model', sa.String(length=100), nullable=True)
    )


def downgrade_():
    op.drop_column('configuracoes_sistema', 'llm_model')


def upgrade_auth():
    op.create_table(
        'mensagens_chat',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('papel', sa.String(length=20), nullable=False),
        sa.Column('conteudo', sa.Text(), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('mensagens_chat', schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f('ix_mensagens_chat_usuario_id'), ['usuario_id'], unique=False
        )
        batch_op.create_index(
            batch_op.f('ix_mensagens_chat_criado_em'), ['criado_em'], unique=False
        )


def downgrade_auth():
    with op.batch_alter_table('mensagens_chat', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_mensagens_chat_criado_em'))
        batch_op.drop_index(batch_op.f('ix_mensagens_chat_usuario_id'))
    op.drop_table('mensagens_chat')


def upgrade_memoria():
    pass


def downgrade_memoria():
    pass
