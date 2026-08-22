# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

from typing import Literal, Optional

from pydantic import BaseModel, Field


class MensagemChatItem(BaseModel):
    papel: Literal["usuario", "assistente"]
    conteudo: str
    criado_em: str = Field(..., description="ISO 8601, UTC.")


class ListaMensagensChatResponse(BaseModel):
    mensagens: list[MensagemChatItem]


class EnviarMensagemChatBody(BaseModel):
    mensagem: str = Field(..., min_length=1, max_length=4000)
    tela: Optional[str] = Field(
        None,
        max_length=200,
        description="Nome legível da tela atual no frontend (ex: 'Resultados (Administrador)'), usado como contexto para a resposta — nunca persistido no histórico.",
    )
    instituicao_id: Optional[int] = Field(
        None,
        description="Instituição sobre a qual perguntar resultados agregados. Consultor só pode informar uma instituição à qual está vinculado (403 caso contrário); Administrador pode informar qualquer uma.",
    )


class MensagemChatResponse(MensagemChatItem):
    pass


class FiltroMensagensChatQuery(BaseModel):
    usuario_id: Optional[int] = Field(
        None,
        description="Somente Administrador pode consultar/excluir/exportar o histórico de outro usuário; Consultor só pode acessar o próprio (403 caso contrário). Omitido = o próprio usuário autenticado.",
    )


class StatusChatResponse(BaseModel):
    disponivel: bool = Field(
        ...,
        description="true quando o chat está ativado e o provedor LLM (provider + chave + modelo) está totalmente configurado.",
    )
