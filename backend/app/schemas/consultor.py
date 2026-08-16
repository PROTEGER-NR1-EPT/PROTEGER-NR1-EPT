"""Schemas do papel Consultor — app/blueprints/consultor.py."""

from typing import Any, Optional

from pydantic import BaseModel, Field, RootModel


class ResultadoAgregadoItem(BaseModel):
    instituicao_id: int
    setor_id: int
    setor_nome: str = Field(..., examples=["Corpo Docente"])
    questionario_id: int
    dominio_id: Optional[int] = Field(
        None,
        description=(
            "Nulo quando o valor é do questionário inteiro (ex.: quadrante do "
            "Karasek, que cruza os domínios 'demanda' e 'controle'); "
            "preenchido quando é um escore por domínio (ex.: cada domínio do "
            "COPSOQ, ou os domínios individuais do Karasek)."
        ),
    )
    dominio_nome: Optional[str] = Field(
        None,
        description="Nulo exatamente quando dominio_id também é nulo.",
        examples=["Exigências no Trabalho"],
    )
    periodo: str = Field(
        ..., description="Sempre 'consolidado' nesta versão do MVP (ver README do backend)."
    )
    n_respostas: int = Field(..., description="Número de respostas brutas usadas no cálculo deste grupo.")
    threshold: int = Field(..., description="Threshold de k-anonimato vigente no momento desta leitura.")
    resultado_disponivel: bool = Field(
        ...,
        description=(
            "false quando n_respostas < threshold — nesse caso valor_agregado "
            "é sempre null, mesmo que o valor exista internamente "
            "(docs/05-regras-de-negocio-e-privacidade.md). Recalculado a cada "
            "leitura: alterar o threshold nas Configurações reflete "
            "imediatamente aqui, sem precisar de nova resposta."
        ),
    )
    valor_agregado: Optional[dict[str, Any]] = Field(
        None,
        description=(
            "Formato depende do instrumento e de dominio_id — sempre null "
            "quando resultado_disponivel é false.\n\n"
            "- Karasek, por domínio (dominio_id preenchido): "
            "{'media': 4.2, 'classificacao': 'alta'} (classificação 'alta'/'baixa' "
            "para o domínio 'demanda', 'alto'/'baixo' para 'controle')\n"
            "- Karasek, geral (dominio_id nulo): {'quadrante': 'alto_desgaste', "
            "'demanda_media': 4.2, 'controle_media': 1.8} — quadrante é um de: "
            "alto_desgaste, trabalho_ativo, trabalho_passivo, baixo_desgaste\n"
            "- COPSOQ, por domínio: {'escore': 62.5, 'faixa': 'amarelo'} — "
            "escore vai de 0 a 100, faixa é uma de: verde, amarelo, vermelho"
        ),
        examples=[
            {"media": 4.2, "classificacao": "alta"},
            {"quadrante": "alto_desgaste", "demanda_media": 4.2, "controle_media": 1.8},
            {"escore": 62.5, "faixa": "amarelo"},
        ],
    )


class ListaResultadosResponse(RootModel[list[ResultadoAgregadoItem]]):
    """Uma linha por domínio (mais uma linha "geral" quando aplicável) do
    questionário — sempre já filtrada por k-anonimato
    (app/services/k_anonimato.py)."""


class RegistroMemoriaResponse(BaseModel):
    id: int
    tipo: str = Field(..., examples=["roda_de_conversa"])
    titulo: str
    descricao: Optional[str] = None
    anexo_url: Optional[str] = None
    criado_em: str = Field(..., description="ISO 8601, UTC.")


class ListaMemoriaResponse(RootModel[list[RegistroMemoriaResponse]]):
    pass
