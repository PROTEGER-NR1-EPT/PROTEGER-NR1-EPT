# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

"""Schemas das rotas públicas (sem autenticação) — app/blueprints/publico.py.

Regra que rege todo este arquivo (docs/04-papeis-e-fluxos-de-usuario.md):
o Usuário respondente nunca deve conseguir descobrir, a partir das
respostas da API, qual instrumento (Karasek/COPSOQ) está sendo aplicado,
nem ver qualquer resultado calculado. Por isso `QuestionarioAtivoResponse`
não tem campo `instrumento` nem `titulo`.
"""

from typing import Optional

from pydantic import BaseModel, Field, RootModel


class InstituicaoPublica(BaseModel):
    id: int = Field(..., description="ID da instituição, usado para popular o dropdown de setores e para enviar respostas.")
    nome: str = Field(..., examples=["Instituto Federal de Exemplo"])
    uf: Optional[str] = Field(None, description="Sigla da UF (2 letras).", examples=["SP"])
    municipio: Optional[str] = Field(None, examples=["São Paulo"])


class ListaInstituicoesPublicasResponse(RootModel[list[InstituicaoPublica]]):
    """Apenas instituições com `ativo = true` aparecem aqui."""


class SetorPublico(BaseModel):
    id: int
    nome: str = Field(..., examples=["Coordenação Pedagógica"])


class ListaSetoresPublicosResponse(RootModel[list[SetorPublico]]):
    """Apenas setores ativos da instituição informada."""


class InstituicaoIdPath(BaseModel):
    instituicao_id: int = Field(..., description="ID da instituição (retornado por GET /instituicoes).")


class QuestionarioAtivoQuery(BaseModel):
    instituicao_id: int = Field(..., description="ID da instituição selecionada pelo respondente no dropdown.")
    setor_id: int = Field(..., description="ID do setor selecionado (precisa pertencer à instituição informada).")


class ItemPublico(BaseModel):
    id: int = Field(..., description="ID do item — é a chave usada no payload de POST /respostas.")
    texto: str = Field(..., examples=["Meu trabalho exige muito de mim emocionalmente."])
    tipo_resposta: str = Field(..., examples=["escala_likert"])
    escala_min: int = Field(..., description="Menor valor aceito para este item.", examples=[1])
    escala_max: int = Field(..., description="Maior valor aceito para este item.", examples=[5])
    regra_condicional: Optional[dict] = Field(
        None,
        description="Reservado para lógica condicional de exibição, interpretada só no frontend.",
    )


class QuestionarioAtivoResponse(BaseModel):
    """Nunca inclui `instrumento`, `dominio` nem `titulo`: o respondente não
    pode identificar qual(is) instrumento(s) está(ão) sendo aplicado(s)
    (docs/04). `itens` já vem em ordem final de apresentação (respeitando
    modo_apresentacao do questionário — blocos ou intercalado), sem
    aninhamento por domínio."""

    questionario_id: int = Field(..., description="Usado como questionario_id em POST /respostas.")
    itens: list[ItemPublico]


class EnviarRespostaBody(BaseModel):
    questionario_id: int = Field(..., description="Obtido em GET /questionarios/ativo.")
    instituicao_id: int
    setor_id: int
    respostas: dict[str, int] = Field(
        ...,
        description=(
            "Mapa {item_id (como string): valor da resposta}. Deve conter "
            "apenas IDs de itens pertencentes ao questionário informado. "
            "Este payload nunca deve conter nome, e-mail, matrícula, IP ou "
            "qualquer outro campo que identifique o respondente — a API "
            "rejeita silenciosamente qualquer chave que não seja um ID de "
            "item válido, retornando erro 400."
        ),
        examples=[{"1": 4, "2": 5, "3": 2, "4": 1}],
        min_length=1,
    )


class EnviarRespostaResponse(BaseModel):
    confirmado: bool = Field(
        True,
        description=(
            "Confirma o recebimento. Não retorna nenhum identificador da "
            "resposta nem eco do payload, para reforçar que nada aqui é "
            "rastreável até o respondente."
        ),
    )
