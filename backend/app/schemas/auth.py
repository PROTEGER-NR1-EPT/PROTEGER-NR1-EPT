"""Schemas de autenticação — app/blueprints/auth.py.

Ver app/auth/security.py para a justificativa da escolha de token opaco de
sessão (não JWT) como mecanismo de autenticação.
"""

from pydantic import BaseModel, Field


class LoginBody(BaseModel):
    email: str = Field(..., examples=["admin@exemplo.com"])
    senha: str = Field(..., min_length=1, description="Senha em texto plano, comparada via bcrypt no servidor.")


class UsuarioResumo(BaseModel):
    id: int
    nome: str
    email: str
    papel: str = Field(..., description="'consultor' ou 'administrador'.", examples=["administrador"])


class LoginResponse(BaseModel):
    token: str = Field(
        ...,
        description=(
            "Token opaco de sessão. Deve ser enviado nas requisições "
            "autenticadas seguintes como `Authorization: Bearer <token>`."
        ),
    )
    expira_em: str = Field(..., description="Data/hora (ISO 8601, UTC) em que a sessão expira.")
    usuario: UsuarioResumo


class LogoutResponse(BaseModel):
    confirmado: bool = Field(True, description="A sessão foi revogada — o token deixa de ser válido imediatamente.")
