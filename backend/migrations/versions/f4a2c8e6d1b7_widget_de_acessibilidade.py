"""widget de acessibilidade

Revision ID: f4a2c8e6d1b7
Revises: e7c2a4d9f1b3
Create Date: 2026-08-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f4a2c8e6d1b7'
down_revision = 'e7c2a4d9f1b3'
branch_labels = None
depends_on = None


def upgrade(engine_name):
    globals()["upgrade_%s" % engine_name]()


def downgrade(engine_name):
    globals()["downgrade_%s" % engine_name]()


def upgrade_():
    op.add_column(
        'configuracoes_sistema',
        sa.Column(
            'acessibilidade_widget_enabled',
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )


def downgrade_():
    op.drop_column('configuracoes_sistema', 'acessibilidade_widget_enabled')


def upgrade_auth():
    pass


def downgrade_auth():
    pass


def upgrade_memoria():
    pass


def downgrade_memoria():
    pass
