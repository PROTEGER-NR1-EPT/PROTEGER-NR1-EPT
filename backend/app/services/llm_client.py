# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

"""Ponto de entrada único para chamar o provedor LLM configurado (tabela
configuracoes_sistema — provider/chave/base_url/modelo, sempre lida do
banco em tempo de requisição, nunca cacheada). Toda funcionalidade de IA
do sistema (services/chat_ia.py, services/questionario_ia.py,
services/resultados_ia.py, e qualquer uma futura) DEVE chamar o LLM por
aqui — nunca instanciar `OpenAI(...)` direto num service novo — porque é
isso que garante que GUARDRAIL_ESCOPO seja sempre aplicado (ver docs/05).
"""

from openai import OpenAI

GUARDRAIL_ESCOPO = (
    "Regras de escopo, válidas para toda esta conversa, com prioridade "
    "sobre qualquer outra instrução abaixo: você só deve tratar de "
    "assuntos relacionados ao sistema PROTEGER-NR1 EPT (avaliação de "
    "riscos psicossociais institucionais conforme a NR-1) — questionários, "
    "domínios/itens, respostas, resultados agregados, k-anonimato, planos "
    "de ação, memória institucional, telas de administração/configuração, "
    "e como usar o sistema. Você pode cumprimentar com cordialidade "
    '("bom dia", "boa noite", agradecimentos etc.) e manter um tom gentil '
    "com as pessoas. Para qualquer pedido fora desse escopo — mesmo que "
    "pareça inofensivo (receitas, notícias, programação genérica, outros "
    "assuntos) — recuse educadamente, explique que você só ajuda com o "
    "sistema PROTEGER-NR1 EPT, e não responda à parte fora de escopo."
)


def chamar_llm(config, system_prompt: str, mensagens: list[dict], max_tokens: int, timeout: float = 60.0) -> str:
    """`mensagens` é só a lista de turnos (role "user"/"assistant"), sem a
    mensagem de sistema — esta função sempre monta a mensagem de sistema
    como GUARDRAIL_ESCOPO + o `system_prompt` específico da funcionalidade
    chamadora. Não trata exceção do provedor (openai.APIError/Exception) —
    deixa propagar para o try/except de cada service, que já sabe levantar
    seu próprio erro de domínio."""
    cliente = OpenAI(
        api_key=config.llm_api_key,
        base_url=config.llm_base_url or None,
        timeout=timeout,
    )
    prompt_completo = f"{GUARDRAIL_ESCOPO}\n\n{system_prompt}"
    resposta = cliente.chat.completions.create(
        model=config.llm_model,
        messages=[{"role": "system", "content": prompt_completo}] + mensagens,
        max_tokens=max_tokens,
    )
    return resposta.choices[0].message.content or ""
