"""planos de acao

Revision ID: 50f442d72796
Revises: d5cb3145c0d4
Create Date: 2026-08-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '50f442d72796'
down_revision = 'd5cb3145c0d4'
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
    pass


def downgrade_auth():
    pass


def upgrade_memoria():
    op.create_table(
        'planos_acao',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('instituicao_id', sa.Integer(), nullable=False),
        sa.Column('ciclo', sa.String(length=50), nullable=False),
        sa.Column('criado_por_usuario_id', sa.Integer(), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('planos_acao', schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f('ix_planos_acao_instituicao_id'), ['instituicao_id'], unique=False
        )

    op.create_table(
        'acoes_plano',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('plano_id', sa.Integer(), nullable=False),
        sa.Column('titulo', sa.String(length=255), nullable=False),
        sa.Column('tag', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('prazo', sa.Date(), nullable=True),
        sa.Column('responsavel', sa.String(length=255), nullable=True),
        sa.Column('participantes', sa.JSON(), nullable=True),
        sa.Column('anexos', sa.JSON(), nullable=True),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('ordem', sa.Integer(), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['plano_id'], ['planos_acao.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('acoes_plano', schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f('ix_acoes_plano_plano_id'), ['plano_id'], unique=False
        )

    op.create_table(
        'tarefas_acao',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('acao_id', sa.Integer(), nullable=False),
        sa.Column('titulo', sa.String(length=255), nullable=False),
        sa.Column('concluida', sa.Boolean(), nullable=False),
        sa.Column('ordem', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['acao_id'], ['acoes_plano.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('tarefas_acao', schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f('ix_tarefas_acao_acao_id'), ['acao_id'], unique=False
        )

    op.create_table(
        'dependencias_acao',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('acao_id', sa.Integer(), nullable=False),
        sa.Column('depende_de_acao_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['acao_id'], ['acoes_plano.id'], ),
        sa.ForeignKeyConstraint(['depende_de_acao_id'], ['acoes_plano.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('acao_id', 'depende_de_acao_id', name='uq_dependencia_acao'),
    )
    with op.batch_alter_table('dependencias_acao', schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f('ix_dependencias_acao_acao_id'), ['acao_id'], unique=False
        )
        batch_op.create_index(
            batch_op.f('ix_dependencias_acao_depende_de_acao_id'),
            ['depende_de_acao_id'],
            unique=False,
        )


def downgrade_memoria():
    with op.batch_alter_table('dependencias_acao', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_dependencias_acao_depende_de_acao_id'))
        batch_op.drop_index(batch_op.f('ix_dependencias_acao_acao_id'))
    op.drop_table('dependencias_acao')

    with op.batch_alter_table('tarefas_acao', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_tarefas_acao_acao_id'))
    op.drop_table('tarefas_acao')

    with op.batch_alter_table('acoes_plano', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_acoes_plano_plano_id'))
    op.drop_table('acoes_plano')

    with op.batch_alter_table('planos_acao', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_planos_acao_instituicao_id'))
    op.drop_table('planos_acao')
