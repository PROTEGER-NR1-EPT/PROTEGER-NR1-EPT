# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.admin import ResultadoDimensaoItem


class StatusSugestaoQuestionarioResponse(BaseModel):
    disponivel: bool = Field(
        ...,
        description="true quando a criação assistida de questionário está ativada e o provedor LLM (provider + chave + modelo) está totalmente configurado.",
    )


class SugestaoQuestionarioBody(BaseModel):
    pedido: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        examples=["Questionário Karasek sobre sobrecarga de trabalho, com 4 itens por domínio."],
    )
    instrumento_preferido: Optional[str] = Field(
        None,
        description="Dica opcional de instrumento ('karasek' ou 'copsoq') — a IA decide sozinha se omitido.",
        examples=["karasek"],
    )


class StatusAnaliseResultadosResponse(BaseModel):
    disponivel: bool = Field(
        ...,
        description="true quando a análise assistida de resultados está ativada e o provedor LLM (provider + chave + modelo) está totalmente configurado.",
    )


class AnaliseResultadosBody(BaseModel):
    resultados: list[ResultadoDimensaoItem] = Field(
        ...,
        min_length=1,
        max_length=300,
        description=(
            "A mesma lista de dimensões já carregada na tela (formato de "
            "GET /admin/resultados ou GET /consultor/instituicoes/{id}/resultados-dashboard) "
            "— a análise processa exatamente esse recorte, sem refazer a consulta no backend."
        ),
    )


class AnaliseResultadosResponse(BaseModel):
    analise: str = Field(..., description="Texto em Markdown, nunca persistido — gerado a cada chamada.")
