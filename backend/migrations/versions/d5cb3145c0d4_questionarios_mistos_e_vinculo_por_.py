"""questionarios mistos e vinculo instituicao-questionario

Revision ID: d5cb3145c0d4
Revises: 8ff1f0a0d654
Create Date: 2026-08-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd5cb3145c0d4'
down_revision = '8ff1f0a0d654'
branch_labels = None
depends_on = None


def upgrade(engine_name):
    globals()["upgrade_%s" % engine_name]()


def downgrade(engine_name):
    globals()["downgrade_%s" % engine_name]()


def upgrade_():
    # 1. instituicoes.questionario_id — vínculo direto de qual questionário
    #    cada instituição usa no fluxo público, substituindo a antiga regra
    #    de "só existe um questionário ativo no sistema todo".
    op.add_column('instituicoes', sa.Column('questionario_id', sa.Integer(), nullable=True))
    with op.batch_alter_table('instituicoes', schema=None) as batch_op:
        batch_op.create_foreign_key(
            'fk_instituicoes_questionario_id', 'questionarios', ['questionario_id'], ['id']
        )
        batch_op.create_index(
            batch_op.f('ix_instituicoes_questionario_id'), ['questionario_id'], unique=False
        )

    # 2. dominios.instrumento — a granularidade de instrumento passa do
    #    questionário (que agora pode ser misto) para o domínio.
    op.add_column('dominios', sa.Column('instrumento', sa.String(length=50), nullable=True))
    op.execute(
        "UPDATE dominios SET instrumento = questionarios.instrumento "
        "FROM questionarios WHERE questionarios.id = dominios.questionario_id"
    )
    with op.batch_alter_table('dominios', schema=None) as batch_op:
        batch_op.alter_column('instrumento', existing_type=sa.String(length=50), nullable=False)

    # 3. questionarios.instrumento deixa de existir — um questionário passa
    #    a poder combinar domínios de instrumentos diferentes.
    op.drop_column('questionarios', 'instrumento')

    # 4. questionarios.modo_apresentacao — "blocos" ou "intercalado" (ver
    #    app/blueprints/publico.py:_montar_itens_em_ordem).
    op.add_column(
        'questionarios',
        sa.Column(
            'modo_apresentacao', sa.String(length=20), nullable=False, server_default='blocos'
        ),
    )


def downgrade_():
    op.drop_column('questionarios', 'modo_apresentacao')

    op.add_column('questionarios', sa.Column('instrumento', sa.String(length=50), nullable=True))
    op.execute(
        "UPDATE questionarios SET instrumento = sub.instrumento FROM ("
        "SELECT DISTINCT ON (questionario_id) questionario_id, instrumento "
        "FROM dominios ORDER BY questionario_id, id"
        ") AS sub WHERE questionarios.id = sub.questionario_id"
    )
    with op.batch_alter_table('questionarios', schema=None) as batch_op:
        batch_op.alter_column('instrumento', existing_type=sa.String(length=50), nullable=False)

    op.drop_column('dominios', 'instrumento')

    with op.batch_alter_table('instituicoes', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_instituicoes_questionario_id'))
        batch_op.drop_constraint('fk_instituicoes_questionario_id', type_='foreignkey')
    op.drop_column('instituicoes', 'questionario_id')


def upgrade_auth():
    pass


def downgrade_auth():
    pass


def upgrade_memoria():
    pass


def downgrade_memoria():
    pass
