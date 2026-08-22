# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

from app.services.instrumentos.base import InstrumentoEstrategia

FAIXA_VERDE = "verde"
FAIXA_AMARELA = "amarelo"
FAIXA_VERMELHA = "vermelho"

# Limiares de classificação do escore 0-100 (docs/06). Escore mais alto =
# mais favorável (baixo risco), seguindo a convenção adotada no documento.
LIMIAR_VERDE = 67
LIMIAR_AMARELO = 34


def _classificar_faixa(escore: float) -> str:
    if escore >= LIMIAR_VERDE:
        return FAIXA_VERDE
    if escore >= LIMIAR_AMARELO:
        return FAIXA_AMARELA
    return FAIXA_VERMELHA


class CopsoqEstrategia(InstrumentoEstrategia):
    """COPSOQ (docs/06): um escore 0-100 por domínio, classificado em
    verde/amarelo/vermelho. Não produz resultado "geral" (cada domínio é
    independente)."""

    chave = "copsoq"

    def calcular(self, respostas: list[dict], dominios: list) -> dict:
        por_dominio = {}
        for dominio in dominios:
            medias = self._valores_do_dominio(respostas, dominio)
            if not medias:
                por_dominio[dominio.id] = {"escore": None, "faixa": None}
                continue

            escala_min, escala_max = self._escala(dominio)
            media_grupo = sum(medias) / len(medias)
            if escala_max == escala_min:
                escore = 0.0
            else:
                escore = (
                    (media_grupo - escala_min) / (escala_max - escala_min)
                ) * 100
            escore = round(max(0.0, min(100.0, escore)), 1)

            por_dominio[dominio.id] = {
                "escore": escore,
                "faixa": _classificar_faixa(escore),
            }

        return {"por_dominio": por_dominio, "geral": None}

    @staticmethod
    def _escala(dominio):
        if not dominio.itens:
            return 1, 5
        primeiro = dominio.itens[0]
        return primeiro.escala_min, primeiro.escala_max
