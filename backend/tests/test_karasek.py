from app.services.instrumentos.karasek import KarasekEstrategia


class _Item:
    def __init__(self, id, escala_min=1, escala_max=5, invertido=False):
        self.id = id
        self.escala_min = escala_min
        self.escala_max = escala_max
        self.invertido = invertido


class _Dominio:
    def __init__(self, id, chave, itens):
        self.id = id
        self.chave = chave
        self.itens = itens


def _montar_dominios():
    dominio_demanda = _Dominio(1, "demanda", [_Item(1), _Item(2)])
    dominio_controle = _Dominio(2, "controle", [_Item(3), _Item(4)])
    return dominio_demanda, dominio_controle


def test_alta_demanda_baixo_controle_e_alto_desgaste():
    dominio_demanda, dominio_controle = _montar_dominios()
    respostas = [
        {"1": 5, "2": 5, "3": 1, "4": 1},
        {"1": 4, "2": 5, "3": 2, "4": 1},
    ]
    resultado = KarasekEstrategia().calcular(respostas, [dominio_demanda, dominio_controle])
    assert resultado["geral"]["quadrante"] == "alto_desgaste"


def test_alta_demanda_alto_controle_e_trabalho_ativo():
    dominio_demanda, dominio_controle = _montar_dominios()
    respostas = [
        {"1": 5, "2": 5, "3": 5, "4": 4},
    ]
    resultado = KarasekEstrategia().calcular(respostas, [dominio_demanda, dominio_controle])
    assert resultado["geral"]["quadrante"] == "trabalho_ativo"


def test_baixa_demanda_baixo_controle_e_trabalho_passivo():
    dominio_demanda, dominio_controle = _montar_dominios()
    respostas = [
        {"1": 1, "2": 2, "3": 1, "4": 2},
    ]
    resultado = KarasekEstrategia().calcular(respostas, [dominio_demanda, dominio_controle])
    assert resultado["geral"]["quadrante"] == "trabalho_passivo"


def test_baixa_demanda_alto_controle_e_baixo_desgaste():
    dominio_demanda, dominio_controle = _montar_dominios()
    respostas = [
        {"1": 1, "2": 2, "3": 5, "4": 5},
    ]
    resultado = KarasekEstrategia().calcular(respostas, [dominio_demanda, dominio_controle])
    assert resultado["geral"]["quadrante"] == "baixo_desgaste"


def test_item_invertido_e_considerado_na_media():
    item_invertido = _Item(5, invertido=True)
    dominio = _Dominio(3, "controle", [item_invertido])
    # valor bruto 1 em item invertido (escala 1-5) vira 5 -> média alta
    valores = KarasekEstrategia()._valores_do_dominio([{"5": 1}], dominio)
    assert valores == [5.0]


def test_dominios_ausentes_geram_erro():
    dominio_unico = _Dominio(1, "demanda", [_Item(1)])
    try:
        KarasekEstrategia().calcular([{"1": 3}], [dominio_unico])
        assert False, "deveria ter levantado ValueError"
    except ValueError:
        pass
