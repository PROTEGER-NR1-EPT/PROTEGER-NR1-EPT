# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

"""Schemas do papel Administrador — app/blueprints/admin.py.

Convenção usada nos bodies de edição (Editar*Body): todos os campos são
opcionais e a rota só altera o que foi explicitamente enviado no payload
(comportamento "PATCH", embora o método HTTP seja PUT) — implementado via
`body.model_dump(exclude_unset=True)`, que distingue "campo omitido" de
"campo enviado como null".
"""

from datetime import datetime
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
    questionario_id: Optional[int] = Field(
        None, description="Questionário que esta instituição usa no fluxo público. Nulo = nenhum vinculado ainda."
    )


class ListaInstituicoesAdminResponse(RootModel[list[InstituicaoAdmin]]):
    """Ao contrário da rota pública, inclui também instituições inativas."""


class CriarInstituicaoBody(BaseModel):
    nome: str = Field(..., min_length=1, examples=["Instituto Federal de Exemplo"])
    uf: Optional[str] = Field(None, max_length=2, examples=["SP"])
    municipio: Optional[str] = Field(None, examples=["São Paulo"])
    questionario_id: Optional[int] = Field(
        None, description="Precisa ser um questionário existente e ativo."
    )


class EditarInstituicaoBody(BaseModel):
    nome: Optional[str] = Field(None, min_length=1)
    uf: Optional[str] = Field(None, max_length=2)
    municipio: Optional[str] = None
    ativo: Optional[bool] = Field(
        None,
        description="Preferir DELETE /admin/instituicoes/{id} para desativar — este campo existe para reativar.",
    )
    questionario_id: Optional[int] = Field(
        None,
        description=(
            "Questionário que esta instituição passa a usar no fluxo público. Precisa ser um "
            "questionário existente e ativo. Enviar null desvincula."
        ),
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
    instrumento: str = Field(
        ...,
        description=(
            "Um dos instrumentos registrados em app/services/instrumentos (atualmente: karasek, "
            "copsoq) — cada domínio carrega o seu, permitindo questionários mistos (domínios de "
            "instrumentos diferentes no mesmo questionário)."
        ),
        examples=["karasek"],
    )
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
    versao: str = Field("1.0", examples=["1.0"])
    ativo: bool = Field(
        False,
        description=(
            "Vários questionários podem estar ativos ao mesmo tempo — 'ativo' significa apenas "
            "'disponível para ser vinculado a uma instituição' (ver "
            "PUT /admin/instituicoes/{id}, campo questionario_id), sem exclusividade entre eles."
        ),
    )
    modo_apresentacao: str = Field(
        "blocos",
        description=(
            "'blocos' (itens agrupados por domínio, na ordem cadastrada) ou 'intercalado' "
            "(itens de domínios diferentes alternados) — relevante sobretudo em questionários "
            "mistos, para decidir como os itens de instrumentos diferentes são apresentados sem "
            "revelar ao respondente que são 'partes' distintas."
        ),
        examples=["blocos"],
    )
    dominios: Optional[list[DominioBody]] = None


class EditarQuestionarioBody(BaseModel):
    titulo: Optional[str] = Field(None, min_length=1)
    versao: Optional[str] = None
    ativo: Optional[bool] = None
    modo_apresentacao: Optional[str] = Field(None, description="'blocos' ou 'intercalado'.")
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
    instrumento: str
    chave: str
    ordem: int
    itens: list[ItemResponse]


class QuestionarioResponse(BaseModel):
    id: int
    titulo: str
    instrumentos: list[str] = Field(
        ..., description="Instrumentos distintos entre os domínios deste questionário (mais de um = misto)."
    )
    versao: str
    ativo: bool
    modo_apresentacao: str
    dominios: list[DominioResponse]


class ListaQuestionariosResponse(RootModel[list[QuestionarioResponse]]):
    pass


class QuestionarioIdPath(BaseModel):
    questionario_id: int


# ---------------------------------------------------------------------------
# Usuários e vínculos
# ---------------------------------------------------------------------------


class InstituicaoVinculadaResumo(BaseModel):
    id: int
    nome: str


class UsuarioAdmin(BaseModel):
    id: int
    nome: str
    email: str
    papel: str = Field(..., examples=["consultor"])
    ativo: bool
    instituicoes: list[InstituicaoVinculadaResumo] = Field(
        default_factory=list,
        description="Instituições vinculadas (ConsultorInstituicao) — sempre vazio para Administrador.",
    )
    ultima_interacao_em: Optional[datetime] = Field(
        None,
        description=(
            "Mais recente entre o último login e a última ação registrada "
            "em log_atividade. Nulo se o usuário nunca fez login."
        ),
    )


class ListaUsuariosResponse(RootModel[list[UsuarioAdmin]]):
    """Nunca inclui `senha_hash`."""


class CriarUsuarioBody(BaseModel):
    nome: str = Field(..., min_length=1)
    email: str = Field(..., examples=["consultor@exemplo.com"])
    senha: str = Field(..., min_length=1, description="Texto plano — o servidor faz o hash com bcrypt antes de gravar.")
    papel: str = Field(..., description="'consultor' ou 'administrador'.", examples=["consultor"])


class EditarUsuarioBody(BaseModel):
    nome: Optional[str] = Field(None, min_length=1)
    email: Optional[str] = None
    papel: Optional[str] = Field(None, description="'consultor' ou 'administrador'.")
    ativo: Optional[bool] = Field(
        None,
        description="Preferir DELETE /admin/usuarios/{id} para desativar — este campo existe para reativar.",
    )


class UsuarioIdPath(BaseModel):
    usuario_id: int


class VincularInstituicoesBody(BaseModel):
    instituicao_ids: list[int] = Field(
        ...,
        min_length=1,
        description="IDs de instituições (banco anônimo) às quais este usuário passa a ter acesso como Consultor.",
        examples=[[1, 2, 3]],
    )


class UsuarioInstituicaoVinculoPath(BaseModel):
    usuario_id: int
    instituicao_id: int


# ---------------------------------------------------------------------------
# Dashboard de resultados (multi-instituição/setor/questionário/instrumento)
# ---------------------------------------------------------------------------


class ExportResultadosInstituicaoQuery(BaseModel):
    setor_id: Optional[int] = Field(None, description="Sem filtro (omitido) = todos os setores.")


class FiltroResultadosQuery(BaseModel):
    instituicao_ids: Optional[list[int]] = Field(
        None, description="Sem filtro (omitido) = todas as instituições."
    )
    setor_ids: Optional[list[int]] = Field(None, description="Sem filtro (omitido) = todos os setores.")
    questionario_ids: Optional[list[int]] = Field(
        None, description="Sem filtro (omitido) = todos os questionários."
    )
    instrumento: Optional[str] = Field(
        None,
        # Nota: Field(examples=[...]) não pode ser usado aqui — modelos usados
        # como query:/path: em flask_openapi3 esperam examples no formato de
        # mapa do OpenAPI clássico, e quebram com uma lista (só funciona em
        # modelos de body:/resposta, ver ListarLogsQuery). Descrição textual
        # no lugar, incluindo um exemplo em prosa.
        description=(
            "'karasek' ou 'copsoq' = só questionários puros daquele instrumento; "
            "'misto' = questionários com domínios de mais de um instrumento (ex.: "
            "'misto'). Combina por interseção com questionario_ids, quando ambos "
            "forem enviados."
        ),
    )


class ResultadoDimensaoItem(BaseModel):
    instituicao_id: int
    instituicao_nome: str
    setor_id: int
    setor_nome: str
    questionario_id: int
    questionario_titulo: str
    dominio_id: int
    dominio_nome: str
    instrumento: str
    n_respostas: int
    threshold: int
    resultado_disponivel: bool
    risco: Optional[float] = Field(
        None,
        description=(
            "0-100, comparável entre instrumentos ('quanto maior, pior') — null se "
            "resultado_disponivel for false. Calculado em tempo de leitura, nunca "
            "gravado em resultados_agregados."
        ),
    )
    nivel_risco: Optional[str] = Field(
        None, description="'baixo' (≤25) / 'moderado' (≤50) / 'alto' (≤75) / 'critico' (>75), ou null."
    )


class ListaResultadosDimensaoResponse(RootModel[list[ResultadoDimensaoItem]]):
    pass


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
    acessibilidade_widget_enabled: bool = Field(
        ..., description="Se false, o widget flutuante de acessibilidade (fonte/contraste) some de todo o site, inclusive para visitantes não autenticados."
    )
    llm_provider: Optional[str] = Field(None, examples=["anthropic"])
    llm_base_url: Optional[str] = None
    llm_model: Optional[str] = Field(None, examples=["claude-sonnet-5"])
    llm_api_key_configurada: bool = Field(
        ..., description="true/false apenas — a chave em si nunca é devolvida pela API em texto plano."
    )


class AtualizarConfiguracoesBody(BaseModel):
    k_anonimato_threshold: Optional[int] = Field(None, ge=1, description="Precisa ser um inteiro >= 1.")
    ia_sugestao_questionario_enabled: Optional[bool] = None
    ia_analise_resultados_enabled: Optional[bool] = None
    ia_chat_enabled: Optional[bool] = None
    acessibilidade_widget_enabled: Optional[bool] = None
    llm_provider: Optional[str] = Field(
        None, description="anthropic, openai, gemini, openrouter, nvidia_build ou cohere (docs/08)."
    )
    llm_api_key: Optional[str] = Field(None, description="Nunca é retornada depois — apenas gravada.")
    llm_base_url: Optional[str] = None
    llm_model: Optional[str] = Field(
        None, description="Nome/slug do modelo a usar em chat.completions.create (ex: claude-sonnet-5, gpt-4o-mini)."
    )


FRASE_CONFIRMACAO_RESET = "RESETAR SISTEMA"


class ResetarSistemaBody(BaseModel):
    frase_confirmacao: str = Field(
        ...,
        description=f"Precisa ser exatamente '{FRASE_CONFIRMACAO_RESET}' (mostrada na tela).",
        examples=[FRASE_CONFIRMACAO_RESET],
    )
    senha_atual: str = Field(
        ..., min_length=1, description="Senha atual do Administrador, para confirmar a identidade."
    )


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
# Estatísticas (painel do Administrador)
# ---------------------------------------------------------------------------


class EstatisticasInstituicoes(BaseModel):
    total: int
    ativas: int


class EstatisticasQuestionarios(BaseModel):
    total: int
    ativos: int


class EstatisticasUsuarios(BaseModel):
    consultores: int
    administradores: int


class EstatisticasRespostas(BaseModel):
    total: int
    ultimos_7_dias: int
    ultimos_30_dias: int


class EstatisticasKAnonimato(BaseModel):
    threshold_atual: int
    grupos_abaixo_threshold: int = Field(
        ...,
        description=(
            "Grupos (instituição + setor + questionário) com pelo menos 1 "
            "resposta, mas ainda abaixo do threshold de k-anonimato — "
            "apenas a contagem, nunca quais grupos são (docs/05)."
        ),
    )


class EstatisticaPorInstituicao(BaseModel):
    instituicao_id: int
    nome: str
    total_respostas: int = Field(
        ...,
        description=(
            "Só o volume de respostas — não passa pelo gate de k-anonimato "
            "porque não expõe conteúdo nem resultado calculado, ao "
            "contrário de GET /admin/instituicoes/{id}/resultados."
        ),
    )


class EstatisticasResponse(BaseModel):
    instituicoes: EstatisticasInstituicoes
    questionarios: EstatisticasQuestionarios
    usuarios: EstatisticasUsuarios
    respostas: EstatisticasRespostas
    k_anonimato: EstatisticasKAnonimato
    por_instituicao: list[EstatisticaPorInstituicao] = Field(
        ..., description="Top 10 instituições por total de respostas, ordem decrescente."
    )


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
