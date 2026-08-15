"""Schemas do papel Administrador — app/blueprints/admin.py.

Convenção usada nos bodies de edição (Editar*Body): todos os campos são
opcionais e a rota só altera o que foi explicitamente enviado no payload
(comportamento "PATCH", embora o método HTTP seja PUT) — implementado via
`body.model_dump(exclude_unset=True)`, que distingue "campo omitido" de
"campo enviado como null".
"""

from typing import Any, Optional

from pydantic import BaseModel, Field, RootModel

# ---------------------------------------------------------------------------
# Instituições
# ---------------------------------------------------------------------------


class InstituicaoAdmin(BaseModel):
    id: int
    nome: str
    uf: Optional[str] = None
    municipio: Optional[str] = None
    ativo: bool = Field(..., description="Instituições inativas somem dos dropdowns públicos.")


class ListaInstituicoesAdminResponse(RootModel[list[InstituicaoAdmin]]):
    """Ao contrário da rota pública, inclui também instituições inativas."""


class CriarInstituicaoBody(BaseModel):
    nome: str = Field(..., min_length=1, examples=["Instituto Federal de Exemplo"])
    uf: Optional[str] = Field(None, max_length=2, examples=["SP"])
    municipio: Optional[str] = Field(None, examples=["São Paulo"])


class EditarInstituicaoBody(BaseModel):
    nome: Optional[str] = Field(None, min_length=1)
    uf: Optional[str] = Field(None, max_length=2)
    municipio: Optional[str] = None
    ativo: Optional[bool] = Field(
        None,
        description="Preferir DELETE /admin/instituicoes/{id} para desativar — este campo existe para reativar.",
    )


# ---------------------------------------------------------------------------
# Setores
# ---------------------------------------------------------------------------


class SetorAdmin(BaseModel):
    id: int
    instituicao_id: int
    nome: str
    ativo: bool


class ListaSetoresAdminResponse(RootModel[list[SetorAdmin]]):
    pass


class ListarSetoresQuery(BaseModel):
    instituicao_id: Optional[int] = Field(None, description="Filtra os setores por instituição.")


class SetorIdPath(BaseModel):
    setor_id: int


class CriarSetorBody(BaseModel):
    instituicao_id: int = Field(..., description="Precisa existir no banco anônimo.")
    nome: str = Field(..., min_length=1, examples=["Coordenação Pedagógica"])


class EditarSetorBody(BaseModel):
    nome: Optional[str] = Field(None, min_length=1)
    ativo: Optional[bool] = None


# ---------------------------------------------------------------------------
# Questionários / domínios / itens
# ---------------------------------------------------------------------------


class ItemBody(BaseModel):
    texto: str = Field(..., examples=["Meu trabalho exige muito de mim emocionalmente."])
    tipo_resposta: str = Field("escala_likert", examples=["escala_likert"])
    ordem: Optional[int] = Field(
        None, description="Se omitido, usa a posição do item na lista (0, 1, 2, ...)."
    )
    escala_min: int = Field(1, description="Menor valor aceito para este item.")
    escala_max: int = Field(5, description="Maior valor aceito para este item.")
    invertido: bool = Field(
        False,
        description=(
            "Item de pontuação invertida (reverse-scored): o valor é "
            "recalculado como (escala_min + escala_max) - valor_bruto antes "
            "de entrar na média do domínio."
        ),
    )
    regra_condicional: Optional[dict[str, Any]] = Field(
        None, description="Reservado para lógica condicional de exibição — não interpretado pelo MVP atual."
    )


class DominioBody(BaseModel):
    nome: str = Field(..., examples=["Demanda Psicológica"])
    chave: str = Field(
        ...,
        description=(
            "Slug usado pelas estratégias de cálculo (app/services/instrumentos). "
            "Para Karasek deve ser exatamente 'demanda' ou 'controle'; para "
            "COPSOQ é livre, um por domínio."
        ),
        examples=["demanda"],
    )
    ordem: Optional[int] = Field(None, description="Se omitido, usa a posição do domínio na lista.")
    itens: list[ItemBody] = Field(default_factory=list)


class CriarQuestionarioBody(BaseModel):
    titulo: str = Field(..., min_length=1, examples=["Pesquisa de Riscos Psicossociais 2026"])
    instrumento: str = Field(
        ...,
        description="Um dos instrumentos registrados em app/services/instrumentos (atualmente: karasek, copsoq).",
        examples=["karasek"],
    )
    versao: str = Field("1.0", examples=["1.0"])
    ativo: bool = Field(
        False,
        description=(
            "Existe no máximo um questionário ativo por vez no sistema todo "
            "(o modelo de dados não vincula questionário a instituição/setor "
            "— ver README do backend). Ativar este questionário desativa "
            "automaticamente qualquer outro que estivesse ativo."
        ),
    )
    dominios: Optional[list[DominioBody]] = None


class EditarQuestionarioBody(BaseModel):
    titulo: Optional[str] = Field(None, min_length=1)
    versao: Optional[str] = None
    ativo: Optional[bool] = None
    dominios: Optional[list[DominioBody]] = Field(
        None,
        description=(
            "Se enviado, SUBSTITUI COMPLETAMENTE os domínios/itens atuais do "
            "questionário (todos os domínios e itens antigos são apagados e "
            "recriados) — não é um merge parcial."
        ),
    )


class ItemResponse(ItemBody):
    id: int
    ordem: int


class DominioResponse(BaseModel):
    id: int
    nome: str
    chave: str
    ordem: int
    itens: list[ItemResponse]


class QuestionarioResponse(BaseModel):
    id: int
    titulo: str
    instrumento: str
    versao: str
    ativo: bool
    dominios: list[DominioResponse]


class ListaQuestionariosResponse(RootModel[list[QuestionarioResponse]]):
    pass


class QuestionarioIdPath(BaseModel):
    questionario_id: int


# ---------------------------------------------------------------------------
# Usuários e vínculos
# ---------------------------------------------------------------------------


class UsuarioAdmin(BaseModel):
    id: int
    nome: str
    email: str
    papel: str = Field(..., examples=["consultor"])
    ativo: bool


class ListaUsuariosResponse(RootModel[list[UsuarioAdmin]]):
    """Nunca inclui `senha_hash`."""


class CriarUsuarioBody(BaseModel):
    nome: str = Field(..., min_length=1)
    email: str = Field(..., examples=["consultor@exemplo.com"])
    senha: str = Field(..., min_length=1, description="Texto plano — o servidor faz o hash com bcrypt antes de gravar.")
    papel: str = Field(..., description="'consultor' ou 'administrador'.", examples=["consultor"])


class UsuarioIdPath(BaseModel):
    usuario_id: int


class VincularInstituicoesBody(BaseModel):
    instituicao_ids: list[int] = Field(
        ...,
        min_length=1,
        description="IDs de instituições (banco anônimo) às quais este usuário passa a ter acesso como Consultor.",
        examples=[[1, 2, 3]],
    )


# ---------------------------------------------------------------------------
# Exportação de respostas brutas
# ---------------------------------------------------------------------------


class ExportRespostasQuery(BaseModel):
    confirmo_export_dados_sensiveis: bool = Field(
        False,
        description=(
            "Precisa ser explicitamente true — sem isso a rota responde 400. "
            "Existe para forçar quem exporta a confirmar que está ciente da "
            "sensibilidade dos dados brutos (docs/05), já que este é o único "
            "endpoint que contorna o filtro de k-anonimato."
        ),
    )
    instituicao_id: Optional[int] = Field(None, description="Filtra a exportação por instituição.")
    setor_id: Optional[int] = Field(None, description="Filtra a exportação por setor.")
    questionario_id: Optional[int] = Field(None, description="Filtra a exportação por questionário.")


# ---------------------------------------------------------------------------
# Configurações do sistema
# ---------------------------------------------------------------------------


class ConfiguracoesResponse(BaseModel):
    k_anonimato_threshold: int = Field(..., description="Número mínimo de respostas para um resultado ser exibido.")
    ia_sugestao_questionario_enabled: bool
    ia_analise_resultados_enabled: bool
    ia_chat_enabled: bool
    llm_provider: Optional[str] = Field(None, examples=["anthropic"])
    llm_base_url: Optional[str] = None
    llm_api_key_configurada: bool = Field(
        ..., description="true/false apenas — a chave em si nunca é devolvida pela API em texto plano."
    )


class AtualizarConfiguracoesBody(BaseModel):
    k_anonimato_threshold: Optional[int] = Field(None, ge=1, description="Precisa ser um inteiro >= 1.")
    ia_sugestao_questionario_enabled: Optional[bool] = None
    ia_analise_resultados_enabled: Optional[bool] = None
    ia_chat_enabled: Optional[bool] = None
    llm_provider: Optional[str] = Field(
        None, description="anthropic, openai, gemini, openrouter ou nvidia_build (docs/08)."
    )
    llm_api_key: Optional[str] = Field(None, description="Nunca é retornada depois — apenas gravada.")
    llm_base_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Log de atividade
# ---------------------------------------------------------------------------


class ListarLogsQuery(BaseModel):
    usuario_id: Optional[int] = None
    # Nota: Field(examples=[...]) não pode ser usado aqui — modelos usados
    # como `query:`/`path:` em flask_openapi3 esperam `examples` no formato
    # de mapa do OpenAPI clássico, e quebram com uma lista (só funciona em
    # modelos de `body:`/resposta). Descrição textual no lugar.
    acao: Optional[str] = Field(None, description="Ex.: 'exportar_respostas_csv'.")
    limite: Optional[int] = Field(200, ge=1, le=1000)


class LogAtividadeItem(BaseModel):
    id: int
    usuario_id: Optional[int] = None
    acao: str
    entidade: Optional[str] = None
    entidade_id: Optional[int] = None
    detalhes: Optional[dict[str, Any]] = None
    criado_em: str = Field(..., description="ISO 8601, UTC.")


class ListaLogsResponse(RootModel[list[LogAtividadeItem]]):
    pass


# ---------------------------------------------------------------------------
# Memória institucional
# ---------------------------------------------------------------------------


class ListarMemoriaQuery(BaseModel):
    instituicao_id: Optional[int] = None


class MemoriaBody(BaseModel):
    instituicao_id: int = Field(..., description="Precisa existir no banco anônimo.")
    tipo: str = Field(..., examples=["roda_de_conversa"])
    titulo: str = Field(..., min_length=1)
    descricao: Optional[str] = None
    anexo_url: Optional[str] = None


class MemoriaResponse(BaseModel):
    id: int
    instituicao_id: int
    tipo: str
    titulo: str
    descricao: Optional[str] = None
    anexo_url: Optional[str] = None
    criado_em: str = Field(..., description="ISO 8601, UTC.")


class ListaMemoriaAdminResponse(RootModel[list[MemoriaResponse]]):
    pass
