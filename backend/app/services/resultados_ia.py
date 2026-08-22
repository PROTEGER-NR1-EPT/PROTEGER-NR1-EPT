# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

"""Análise assistida de resultados — usa o mesmo provedor LLM configurado
pelo Administrador (tabela configuracoes_sistema, sempre lida do banco em
tempo de requisição — mesmo padrão de services/k_anonimato.py,
services/chat_ia.py e services/questionario_ia.py).

Analisa exatamente a lista de dimensões que o frontend já tem carregada na
tela (mesmo formato de GET /admin/resultados e
GET /consultor/instituicoes/{id}/resultados-dashboard, já filtrada por
k-anonimato) — o backend não refaz a consulta nem recebe filtros de
instituição/setor, só o que já foi mostrado ao usuário. Sem persistência:
cada chamada gera um texto novo, nada é gravado no banco.
"""

import openai
from openai import OpenAI

from app.schemas.admin import ResultadoDimensaoItem
from app.services.k_anonimato import obter_configuracao

SYSTEM_PROMPT = (
    "Você analisa resultados agregados de avaliação de riscos psicossociais "
    "institucionais (NR-1) no sistema PROTEGER-NR1 EPT. Você recebe uma "
    "lista de dimensões (domínio de um questionário, já agregado por "
    "instituição/setor/questionário, sempre com anonimato k garantido — "
    "nunca é dado individual) com um score de risco de 0 a 100 ('quanto "
    "maior, pior', comparável entre instrumentos diferentes) e um nível de "
    "4 faixas (baixo/moderado/alto/critico). Escreva, em português do "
    "Brasil e em Markdown, uma análise objetiva desses dados: destaque os "
    "pontos de maior atenção (risco alto/crítico), padrões relevantes (por "
    "instituição, setor ou instrumento, quando houver mais de um), e "
    "sugestões gerais de ação — sem inventar números que não estão nos "
    "dados fornecidos. Termine sempre deixando claro que essa análise é um "
    "apoio inicial e não substitui a avaliação de um profissional de saúde "
    "e segurança do trabalho."
)

LIMITE_TOKENS_RESPOSTA = 2048


class AnaliseIndisponivelError(Exception):
    def __init__(self, codigo: str, mensagem: str, status: int):
        self.codigo = codigo
        self.mensagem = mensagem
        self.status = status
        super().__init__(mensagem)


def analise_disponivel() -> bool:
    config = obter_configuracao()
    return bool(
        config.ia_analise_resultados_enabled
        and config.llm_provider
        and config.llm_api_key
        and config.llm_model
    )


def _formatar_resultados(resultados: list[ResultadoDimensaoItem]) -> str:
    linhas = ["Dimensões avaliadas (já filtradas por k-anonimato):"]
    for r in resultados:
        rotulo = f"{r.instituicao_nome} / {r.setor_nome} / {r.questionario_titulo} / {r.dominio_nome} ({r.instrumento})"
        if r.resultado_disponivel:
            linhas.append(f"- {rotulo}: risco {r.risco} ({r.nivel_risco}), n={r.n_respostas}")
        else:
            linhas.append(f"- {rotulo}: dados insuficientes (n={r.n_respostas})")
    return "\n".join(linhas)


def gerar_analise(resultados: list[ResultadoDimensaoItem]) -> str:
    config = obter_configuracao()

    if not config.ia_analise_resultados_enabled:
        raise AnaliseIndisponivelError(
            "analise_desativada",
            "A análise assistida de resultados não está ativada. Peça a um "
            "Administrador para habilitá-la em Configurações.",
            403,
        )

    if not config.llm_provider or not config.llm_api_key or not config.llm_model:
        raise AnaliseIndisponivelError(
            "provedor_llm_nao_configurado",
            "O provedor de IA ainda não foi configurado por um Administrador.",
            400,
        )

    if not resultados:
        raise AnaliseIndisponivelError(
            "sem_resultados", "Não há resultados para analisar.", 400
        )

    mensagem_usuario = _formatar_resultados(resultados)

    cliente = OpenAI(
        api_key=config.llm_api_key,
        base_url=config.llm_base_url or None,
        timeout=60.0,
    )

    try:
        resposta = cliente.chat.completions.create(
            model=config.llm_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": mensagem_usuario},
            ],
            max_tokens=LIMITE_TOKENS_RESPOSTA,
        )
        return resposta.choices[0].message.content or ""
    except openai.APIError:
        raise AnaliseIndisponivelError(
            "erro_provedor_llm",
            "Não foi possível gerar a análise agora. Tente novamente em instantes.",
            502,
        )
    except Exception:
        raise AnaliseIndisponivelError(
            "erro_provedor_llm",
            "Não foi possível gerar a análise agora. Tente novamente em instantes.",
            502,
        )
