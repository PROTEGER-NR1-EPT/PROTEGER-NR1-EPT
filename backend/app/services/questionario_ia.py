# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

"""Criação assistida de questionário — usa o mesmo provedor LLM configurado
pelo Administrador (tabela configuracoes_sistema, sempre lida do banco em
tempo de requisição — mesmo padrão de services/k_anonimato.py e
services/chat_ia.py).

Gera só um RASCUNHO (nunca grava no banco): o Administrador revisa e edita
no formulário de questionário já existente antes de mandar pra
POST /admin/questionarios, o único lugar que persiste. Por isso o rascunho
é validado aqui contra o mesmo schema Pydantic (CriarQuestionarioBody) e a
mesma checagem de instrumento (instrumento_invalido) usados naquele
endpoint — se validar aqui, tem garantia de que vai validar lá também.
"""

import json
import re

import openai
from pydantic import ValidationError

from app.schemas.admin import CriarQuestionarioBody
from app.services import llm_client
from app.services.instrumentos import instrumento_invalido, instrumentos_disponiveis
from app.services.instrumentos.karasek import CHAVE_CONTROLE, CHAVE_DEMANDA
from app.services.k_anonimato import obter_configuracao

SYSTEM_PROMPT = (
    "Você monta questionários de avaliação de riscos psicossociais "
    "institucionais (NR-1) para o sistema PROTEGER-NR1 EPT, a partir de um "
    "pedido em português descrito pelo Administrador. Responda SOMENTE com "
    "um objeto JSON válido, sem nenhum texto antes ou depois, sem comentários "
    "e sem cercas de código (` ``` `) — só o JSON puro. O JSON deve seguir "
    "exatamente este formato:\n\n"
    "{\n"
    '  "titulo": string,\n'
    '  "versao": string (ex.: "1.0"),\n'
    '  "modo_apresentacao": "blocos" ou "intercalado",\n'
    '  "dominios": [\n'
    "    {\n"
    '      "nome": string,\n'
    '      "instrumento": "karasek" ou "copsoq",\n'
    '      "chave": string,\n'
    '      "itens": [\n'
    "        {\n"
    '          "texto": string (afirmação a que o respondente reage),\n'
    '          "tipo_resposta": "escala_likert",\n'
    '          "escala_min": 1,\n'
    '          "escala_max": 5,\n'
    '          "invertido": true ou false\n'
    "        }\n"
    "      ]\n"
    "    }\n"
    "  ]\n"
    "}\n\n"
    "Regras dos instrumentos:\n"
    "- \"karasek\" (Karasek Demand-Control): o questionário deve ter "
    'exatamente dois domínios desse instrumento, com "chave" igual a '
    '"demanda" e "controle" (um domínio para cada) — nunca outros valores '
    "de chave para karasek.\n"
    '- "copsoq": cada domínio é um tema livre (ex.: "Exigências no '
    "trabalho\", \"Organização do trabalho\"), com \"chave\" um slug curto "
    "e único (minúsculas, sem espaço, ex.: \"exigencias\") — pode ter "
    "quantos domínios COPSOQ fizerem sentido para o pedido.\n"
    "- Um questionário pode misturar domínios karasek e copsoq só se o "
    "pedido pedir explicitamente por ambos; por padrão, use um único "
    "instrumento coerente com o pedido.\n\n"
    "Gere entre 2 e 6 domínios, cada um com 3 a 8 itens, com afirmações "
    "claras e específicas (não genéricas), sempre em português do Brasil. "
    "Use \"invertido\": true para itens formulados de forma positiva num "
    "domínio de risco (ex.: \"Tenho liberdade para decidir como fazer meu "
    'trabalho" num domínio de risco) — de forma que a pontuação continue '
    "comparável aos demais itens do domínio."
)

LIMITE_TOKENS_RESPOSTA = 4096


class SugestaoIndisponivelError(Exception):
    def __init__(self, codigo: str, mensagem: str, status: int):
        self.codigo = codigo
        self.mensagem = mensagem
        self.status = status
        super().__init__(mensagem)


def sugestao_disponivel() -> bool:
    config = obter_configuracao()
    return bool(
        config.ia_sugestao_questionario_enabled
        and config.llm_provider
        and config.llm_api_key
        and config.llm_model
    )


def _extrair_json(texto: str) -> dict:
    limpo = texto.strip()
    # Defensivo: alguns provedores respondem com cercas de código mesmo
    # quando instruídos a não usar — remove ```json/``` (ou só ```) das
    # pontas antes de tentar decodificar.
    limpo = re.sub(r"^```(?:json)?\s*", "", limpo)
    limpo = re.sub(r"\s*```$", "", limpo)
    try:
        return json.loads(limpo)
    except json.JSONDecodeError:
        raise SugestaoIndisponivelError(
            "ia_resposta_invalida",
            "A IA não retornou um questionário em formato válido. Tente "
            "novamente ou reformule o pedido.",
            502,
        )


def _validar_estrutura_karasek(dominios: list) -> None:
    chaves_karasek = {d.chave for d in dominios if d.instrumento == "karasek"}
    if chaves_karasek and chaves_karasek != {CHAVE_DEMANDA, CHAVE_CONTROLE}:
        raise SugestaoIndisponivelError(
            "ia_resposta_invalida",
            "A IA gerou domínios Karasek com chaves inválidas (precisa ser "
            "exatamente 'demanda' e 'controle'). Tente novamente ou "
            "reformule o pedido.",
            502,
        )


def gerar_sugestao(pedido: str, instrumento_preferido: str | None = None) -> CriarQuestionarioBody:
    config = obter_configuracao()

    if not config.ia_sugestao_questionario_enabled:
        raise SugestaoIndisponivelError(
            "sugestao_desativada",
            "A criação assistida de questionário não está ativada. Peça a "
            "um Administrador para habilitá-la em Configurações.",
            403,
        )

    if not config.llm_provider or not config.llm_api_key or not config.llm_model:
        raise SugestaoIndisponivelError(
            "provedor_llm_nao_configurado",
            "O provedor de IA ainda não foi configurado por um Administrador.",
            400,
        )

    mensagem_usuario = pedido
    if instrumento_preferido:
        mensagem_usuario += f"\n\n(Instrumento preferido: {instrumento_preferido})"

    try:
        texto_resposta = llm_client.chamar_llm(
            config,
            SYSTEM_PROMPT,
            [{"role": "user", "content": mensagem_usuario}],
            max_tokens=LIMITE_TOKENS_RESPOSTA,
            timeout=60.0,
        )
    except openai.APIError:
        raise SugestaoIndisponivelError(
            "erro_provedor_llm",
            "Não foi possível gerar a sugestão agora. Tente novamente em instantes.",
            502,
        )
    except Exception:
        raise SugestaoIndisponivelError(
            "erro_provedor_llm",
            "Não foi possível gerar a sugestão agora. Tente novamente em instantes.",
            502,
        )

    dados = _extrair_json(texto_resposta)

    try:
        rascunho = CriarQuestionarioBody(**dados)
    except ValidationError:
        raise SugestaoIndisponivelError(
            "ia_resposta_invalida",
            "A IA não retornou um questionário em formato válido. Tente "
            "novamente ou reformule o pedido.",
            502,
        )

    dominios_dados = [d.model_dump(exclude_none=True) for d in rascunho.dominios] if rascunho.dominios else None
    nome_invalido = instrumento_invalido(dominios_dados)
    if nome_invalido is not None:
        raise SugestaoIndisponivelError(
            "ia_resposta_invalida",
            f"A IA gerou um domínio ('{nome_invalido}') com instrumento inválido — "
            f"deve ser um de: {instrumentos_disponiveis()}. Tente novamente.",
            502,
        )

    _validar_estrutura_karasek(rascunho.dominios or [])

    return rascunho
