from app.services.instrumentos.copsoq import CopsoqEstrategia
from app.services.instrumentos.karasek import KarasekEstrategia

_REGISTRO = {
    KarasekEstrategia.chave: KarasekEstrategia(),
    CopsoqEstrategia.chave: CopsoqEstrategia(),
}


def instrumentos_disponiveis() -> list[str]:
    return list(_REGISTRO.keys())


def obter_estrategia(instrumento: str):
    """Novos instrumentos são adicionados registrando uma nova
    InstrumentoEstrategia aqui — sem alterar a estrutura central de
    questionarios/dominios/itens (docs/06)."""
    estrategia = _REGISTRO.get(instrumento)
    if estrategia is None:
        raise ValueError(f"Instrumento desconhecido: {instrumento!r}")
    return estrategia


def _classificar_nivel_risco(risco: float) -> str:
    if risco <= 25:
        return "baixo"
    if risco <= 50:
        return "moderado"
    if risco <= 75:
        return "alto"
    return "critico"


def calcular_risco_dominio(dominio, valor_agregado: dict):
    """Deriva, em tempo de LEITURA (nunca gravado em `resultados_agregados`),
    um risco 0-100 comparável entre instrumentos diferentes — "quanto maior,
    pior" — e o nível de 4 faixas (baixo/moderado/alto/critico) usados pelo
    dashboard de Resultados do Administrador (docs/07,
    services/resultados_dashboard.py). Por ser calculado na leitura, funciona
    para qualquer dado já existente sem precisar de nenhum recálculo/backfill
    — não altera nem depende de mudança nas estratégias `calcular()`
    (karasek.py/copsoq.py continuam exatamente como estavam).

    Retorna (None, None) se o instrumento do domínio não for reconhecido ou
    se o valor agregado não tiver os campos esperados (ex.: grupo abaixo do
    threshold de k-anonimato, com valor_agregado vazio)."""
    if not valor_agregado:
        return None, None

    if dominio.instrumento == "copsoq":
        escore = valor_agregado.get("escore")
        if escore is None:
            return None, None
        risco = 100 - escore
    elif dominio.instrumento == "karasek":
        media = valor_agregado.get("media")
        if media is None or not dominio.itens:
            return None, None
        primeiro = dominio.itens[0]
        escala_min, escala_max = primeiro.escala_min, primeiro.escala_max
        if escala_max == escala_min:
            normalizado = 0.0
        else:
            normalizado = ((media - escala_min) / (escala_max - escala_min)) * 100
        normalizado = max(0.0, min(100.0, normalizado))
        # "demanda" é fator de risco (mais = pior); "controle" é fator de
        # proteção (mais = melhor) — mesma convenção de karasek.py.
        risco = normalizado if dominio.chave == "demanda" else 100 - normalizado
    else:
        return None, None

    risco = round(max(0.0, min(100.0, risco)), 1)
    return risco, _classificar_nivel_risco(risco)
