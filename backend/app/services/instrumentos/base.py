from abc import ABC, abstractmethod


class InstrumentoEstrategia(ABC):
    """Strategy plugável de cálculo de instrumento (docs/06).

    `calcular` recebe as respostas brutas de um grupo (instituição + setor +
    questionário) já carregado e retorna um dicionário no formato:

        {
            "por_dominio": {dominio_id: {...valor específico do instrumento...}, ...},
            "geral": {...} | None,   # ex.: quadrante do Karasek, que cruza domínios
        }

    Nunca calcula nem expõe resultado por respondente individual — apenas
    agregado do grupo. A aplicação do threshold de k-anonimato acontece
    depois, em services/k_anonimato.py, nunca dentro da estratégia.
    """

    chave = None  # ex.: "karasek", "copsoq" — usado no registro (__init__.py)

    @abstractmethod
    def calcular(self, respostas: list[dict], dominios: list) -> dict:
        raise NotImplementedError

    @staticmethod
    def _valores_do_dominio(respostas: list[dict], dominio) -> list[float]:
        """Extrai, por respondente, a média dos itens do domínio (aplicando
        inversão de escala quando `item.invertido` é verdadeiro). Itens não
        respondidos são ignorados na média daquele respondente."""
        medias = []
        for payload in respostas:
            valores = []
            for item in dominio.itens:
                bruto = payload.get(str(item.id))
                if bruto is None:
                    continue
                try:
                    valor = float(bruto)
                except (TypeError, ValueError):
                    continue
                if item.invertido:
                    valor = (item.escala_min + item.escala_max) - valor
                valores.append(valor)
            if valores:
                medias.append(sum(valores) / len(valores))
        return medias
