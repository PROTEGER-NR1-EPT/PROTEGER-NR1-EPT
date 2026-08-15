from app.auth.security import gerar_hash_senha
from app.extensions import db
from app.models.auth import PAPEL_ADMINISTRADOR, Usuario


def bootstrap_admin_inicial(email: str, senha: str) -> Usuario | None:
    """Cria o primeiro Administrador a partir de ADMIN_BOOTSTRAP_EMAIL /
    ADMIN_BOOTSTRAP_PASSWORD. Idempotente: se já existir um usuário com
    esse e-mail, não faz nada e retorna None (docs/04, docs/08)."""
    if not email or not senha:
        raise ValueError(
            "ADMIN_BOOTSTRAP_EMAIL e ADMIN_BOOTSTRAP_PASSWORD precisam estar "
            "definidos para rodar o bootstrap."
        )

    existente = db.session.query(Usuario).filter_by(email=email).first()
    if existente is not None:
        return None

    admin = Usuario(
        nome="Administrador",
        email=email,
        senha_hash=gerar_hash_senha(senha),
        papel=PAPEL_ADMINISTRADOR,
        ativo=True,
    )
    db.session.add(admin)
    db.session.commit()
    return admin
