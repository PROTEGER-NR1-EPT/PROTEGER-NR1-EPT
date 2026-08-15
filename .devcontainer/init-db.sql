-- Cria os 3 bancos de dados separados usados pelo PROTEGER-NR1 EPT
-- (espelham as 3 databases Neon Postgres em produção)

CREATE DATABASE anonimo_db;
CREATE DATABASE auth_db;
CREATE DATABASE memoria_db;

GRANT ALL PRIVILEGES ON DATABASE anonimo_db TO devuser;
GRANT ALL PRIVILEGES ON DATABASE auth_db TO devuser;
GRANT ALL PRIVILEGES ON DATABASE memoria_db TO devuser;
