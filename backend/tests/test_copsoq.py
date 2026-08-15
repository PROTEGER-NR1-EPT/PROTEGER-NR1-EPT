from app.services.instrumentos.copsoq import CopsoqEstrategia


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


def test_escore_maximo_e_faixa_verde():
    dominio = _Dominio(1, "exigencias", [_Item(1), _Item(2)])
    respostas = [{"1": 5, "2": 5}, {"1": 5, "2": 5}]
    resultado = CopsoqEstrategia().calcular(respostas, [dominio])
    assert resultado["por_dominio"][1]["escore"] == 100.0
    assert resultado["por_dominio"][1]["faixa"] == "verde"


def test_escore_minimo_e_faixa_vermelha():
    dominio = _Dominio(1, "exigencias", [_Item(1), _Item(2)])
    respostas = [{"1": 1, "2": 1}]
    resultado = CopsoqEstrategia().calcular(respostas, [dominio])
    assert resultado["por_dominio"][1]["escore"] == 0.0
    assert resultado["por_dominio"][1]["faixa"] == "vermelho"


def test_escore_intermediario_e_faixa_amarela():
    dominio = _Dominio(1, "exigencias", [_Item(1)])
    # escala 1-5, resposta 3 -> (3-1)/(5-1)*100 = 50
    respostas = [{"1": 3}]
    resultado = CopsoqEstrategia().calcular(respostas, [dominio])
    assert resultado["por_dominio"][1]["escore"] == 50.0
    assert resultado["por_dominio"][1]["faixa"] == "amarelo"


def test_item_invertido_inverte_a_pontuacao():
    item_invertido = _Item(1, invertido=True)
    dominio = _Dominio(1, "exigencias", [item_invertido])
    # resposta 1 em item invertido (escala 1-5) -> 5 -> escore 100
    resultado = CopsoqEstrategia().calcular([{"1": 1}], [dominio])
    assert resultado["por_dominio"][1]["escore"] == 100.0


def test_dominio_sem_nenhuma_resposta_fica_sem_escore():
    dominio = _Dominio(1, "exigencias", [_Item(1)])
    resultado = CopsoqEstrategia().calcular([{}], [dominio])
    assert resultado["por_dominio"][1] == {"escore": None, "faixa": None}


def test_nao_produz_resultado_geral():
    dominio = _Dominio(1, "exigencias", [_Item(1)])
    resultado = CopsoqEstrategia().calcular([{"1": 3}], [dominio])
    assert resultado["geral"] is None
