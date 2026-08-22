# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

from app.services.instrumentos.base import InstrumentoEstrategia

CHAVE_DEMANDA = "demanda"
CHAVE_CONTROLE = "controle"


class KarasekEstrategia(InstrumentoEstrategia):
    """Karasek Demand-Control (docs/06): cruza demanda psicológica x
    controle sobre o trabalho em 4 quadrantes. Espera um questionário com
    exatamente dois domínios de chave "demanda" e "controle".
    """

    chave = "karasek"

    def calcular(self, respostas: list[dict], dominios: list) -> dict:
        por_chave = {d.chave: d for d in dominios}
        dominio_demanda = por_chave.get(CHAVE_DEMANDA)
        dominio_controle = por_chave.get(CHAVE_CONTROLE)
        if dominio_demanda is None or dominio_controle is None:
            raise ValueError(
                "Questionário Karasek precisa de domínios com chave "
                "'demanda' e 'controle'."
            )

        medias_demanda = self._valores_do_dominio(respostas, dominio_demanda)
        medias_controle = self._valores_do_dominio(respostas, dominio_controle)

        media_demanda_grupo = self._media(medias_demanda)
        media_controle_grupo = self._media(medias_controle)

        ponto_medio_demanda = self._ponto_medio(dominio_demanda)
        ponto_medio_controle = self._ponto_medio(dominio_controle)

        demanda_alta = (
            media_demanda_grupo is not None and media_demanda_grupo >= ponto_medio_demanda
        )
        controle_alto = (
            media_controle_grupo is not None
            and media_controle_grupo >= ponto_medio_controle
        )

        quadrante = None
        if media_demanda_grupo is not None and media_controle_grupo is not None:
            if demanda_alta and not controle_alto:
                quadrante = "alto_desgaste"
            elif demanda_alta and controle_alto:
                quadrante = "trabalho_ativo"
            elif not demanda_alta and not controle_alto:
                quadrante = "trabalho_passivo"
            else:
                quadrante = "baixo_desgaste"

        por_dominio = {
            dominio_demanda.id: {
                "media": media_demanda_grupo,
                "classificacao": "alta" if demanda_alta else "baixa",
            },
            dominio_controle.id: {
                "media": media_controle_grupo,
                "classificacao": "alto" if controle_alto else "baixo",
            },
        }

        geral = (
            {
                "quadrante": quadrante,
                "demanda_media": media_demanda_grupo,
                "controle_media": media_controle_grupo,
            }
            if quadrante is not None
            else None
        )

        return {"por_dominio": por_dominio, "geral": geral}

    @staticmethod
    def _media(valores: list[float]):
        if not valores:
            return None
        return round(sum(valores) / len(valores), 2)

    @staticmethod
    def _ponto_medio(dominio) -> float:
        if not dominio.itens:
            return 3.0
        primeiro = dominio.itens[0]
        return (primeiro.escala_min + primeiro.escala_max) / 2
