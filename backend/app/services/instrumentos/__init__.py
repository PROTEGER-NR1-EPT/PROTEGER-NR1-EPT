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
