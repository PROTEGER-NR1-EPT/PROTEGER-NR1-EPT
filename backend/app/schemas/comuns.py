# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

"""Schemas Pydantic compartilhados por todos os blueprints.

Estes modelos existem apenas para gerar a documentação OpenAPI (Scalar) e
validar automaticamente parâmetros/corpo de requisição — eles não
substituem as regras de negócio, que continuam implementadas nas funções
de rota e em app/services/. Ver app/__init__.py para como os erros de
validação do Pydantic são convertidos para o mesmo formato de erro usado
manualmente em todo o resto da API (app/blueprints/__init__.py:erro_json).
"""

from typing import Any, Optional

from pydantic import BaseModel, Field


class ErroResponse(BaseModel):
    """Formato padrão de erro da API (docs/07-especificacao-api.md). Usado
    tanto pelos erros levantados manualmente nas rotas quanto pelos erros
    de validação automática do Pydantic."""

    erro: str = Field(
        ...,
        description="Código machine-readable do erro, estável entre versões da API.",
        examples=["payload_invalido"],
    )
    mensagem: str = Field(
        ..., description="Descrição amigável do erro, em português, própria para exibir ao usuário final."
    )
    detalhes: dict[str, Any] = Field(
        default_factory=dict,
        description="Informações adicionais específicas do erro (pode vir vazio: {}).",
    )


class ConfirmadoResponse(BaseModel):
    confirmado: bool = Field(True, description="Confirma que a operação foi concluída com sucesso.")


class IdCriadoResponse(BaseModel):
    id: int = Field(..., description="Identificador do recurso recém-criado.")


def respostas_erro(*codigos: int) -> dict[int, type[BaseModel]]:
    """Atalho para declarar, em `responses={...}` de uma rota, quais
    códigos de erro (além do 200/201 de sucesso) ela pode retornar — todos
    usando o mesmo ErroResponse."""
    return {codigo: ErroResponse for codigo in codigos}


class PaginacaoQuery(BaseModel):
    limite: Optional[int] = Field(
        200,
        ge=1,
        le=1000,
        description="Número máximo de registros retornados (1 a 1000).",
    )
