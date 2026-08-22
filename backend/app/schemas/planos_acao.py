# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

"""Schemas de Planos de Ação — app/blueprints/planos_acao.py.

Mesma convenção de Editar*Body do resto do projeto: campos opcionais,
`exclude_unset` distingue "omitido" de "enviado como null". `tarefas` e
`depende_de_ids`, quando enviados, SUBSTITUEM completamente a lista atual
(mesmo padrão de `dominios` em EditarQuestionarioBody).
"""

from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, Field, RootModel


class TarefaBody(BaseModel):
    titulo: str = Field(..., min_length=1)
    concluida: bool = False


class TarefaResponse(BaseModel):
    id: int
    titulo: str
    concluida: bool
    ordem: int


class AnexoBody(BaseModel):
    titulo: str = Field(..., min_length=1)
    url: str = Field(..., min_length=1)


class AcaoResumo(BaseModel):
    id: int
    titulo: str


class AcaoResponse(BaseModel):
    id: int
    plano_id: int
    titulo: str
    tag: Optional[str] = None
    status: str = Field(..., examples=["pendente"])
    prazo: Optional[str] = Field(None, description="ISO 8601 (YYYY-MM-DD).")
    responsavel: Optional[str] = None
    participantes: list[str] = Field(default_factory=list)
    anexos: list[dict[str, Any]] = Field(default_factory=list, description="Lista de {titulo, url}.")
    descricao: Optional[str] = None
    ordem: int
    criado_em: str = Field(..., description="ISO 8601, UTC.")
    atualizado_em: str = Field(..., description="ISO 8601, UTC.")
    tarefas: list[TarefaResponse] = Field(default_factory=list)
    depende_de: list[AcaoResumo] = Field(default_factory=list)
    bloqueia: list[AcaoResumo] = Field(
        default_factory=list, description="Calculado por inversão de 'depende_de' — sem coluna própria."
    )


class ListaAcoesResponse(RootModel[list[AcaoResponse]]):
    pass


class CriarAcaoBody(BaseModel):
    titulo: str = Field(..., min_length=1)
    tag: Optional[str] = None
    status: str = Field("pendente", description="'pendente', 'em_andamento' ou 'concluido'.")
    prazo: Optional[date] = None
    responsavel: Optional[str] = None
    participantes: Optional[list[str]] = None
    anexos: Optional[list[AnexoBody]] = None
    descricao: Optional[str] = None
    tarefas: Optional[list[TarefaBody]] = None
    depende_de_ids: Optional[list[int]] = Field(
        None, description="IDs de outras ações do mesmo plano das quais esta depende."
    )


class EditarAcaoBody(BaseModel):
    titulo: Optional[str] = Field(None, min_length=1)
    tag: Optional[str] = None
    status: Optional[str] = None
    prazo: Optional[date] = None
    responsavel: Optional[str] = None
    participantes: Optional[list[str]] = None
    anexos: Optional[list[AnexoBody]] = None
    descricao: Optional[str] = None
    ordem: Optional[int] = None
    tarefas: Optional[list[TarefaBody]] = None
    depende_de_ids: Optional[list[int]] = None


class EditarTarefaBody(BaseModel):
    concluida: bool


class PlanoResponse(BaseModel):
    id: int
    instituicao_id: int
    ciclo: str
    criado_em: str = Field(..., description="ISO 8601, UTC.")
    total_acoes: int
    concluidas: int


class ListaPlanosResponse(RootModel[list[PlanoResponse]]):
    pass


class CriarPlanoBody(BaseModel):
    ciclo: str = Field(..., min_length=1, examples=["Mar/2026"])


class EditarPlanoBody(BaseModel):
    ciclo: str = Field(..., min_length=1, examples=["Mar/2026"])


class PlanoIdPath(BaseModel):
    plano_id: int


class AcaoIdPath(BaseModel):
    acao_id: int


class TarefaIdPath(BaseModel):
    tarefa_id: int
