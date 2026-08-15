from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

# ---------------------------------------------------------------------------
# Três bancos, uma engine por banco — decisão de implementação
# ---------------------------------------------------------------------------
# O pedido original era três *instâncias* de SQLAlchemy (uma por banco).
# Isso não é possível com Flask-SQLAlchemy 3.x: `SQLAlchemy.init_app()`
# recusa registrar uma segunda instância no mesmo app Flask (levanta
# RuntimeError — "A 'SQLAlchemy' instance has already been registered").
#
# A forma suportada pelo próprio Flask-SQLAlchemy para múltiplos bancos é
# `SQLALCHEMY_BINDS`: uma única instância `db`, mas com uma *engine (pool de
# conexão) fisicamente separada por bind key* — nunca uma engine
# compartilhada entre bancos. Verificado empiricamente: cada bind key tem
# seu próprio `db.engines[key]`, aponta para um Postgres diferente, e não
# enxerga as tabelas dos outros bancos.
#
# `db_anonimo` é o bind padrão (sem __bind_key__); `db_auth` e `db_memoria`
# são os bind keys "auth" e "memoria" (ver SQLALCHEMY_BINDS em app/__init__.py).
# Os modelos em cada app/models/*.py declaram __bind_key__ de acordo — ver
# comentário em cada arquivo de modelo.
db = SQLAlchemy()

# Flask-Migrate suporta nativamente múltiplos bancos via `--multidb`
# (um diretório migrations/ único, com uma revisão por bind key).
migrate = Migrate()

cors = CORS()
