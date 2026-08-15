from app.services.k_anonimato import aplicar_k_anonimato


def test_resultado_disponivel_quando_atinge_o_threshold():
    resultado = aplicar_k_anonimato(5, {"escore": 42}, threshold=5)
    assert resultado["resultado_disponivel"] is True
    assert resultado["valor_agregado"] == {"escore": 42}
    assert resultado["n_respostas"] == 5
    assert resultado["threshold"] == 5


def test_resultado_oculto_quando_abaixo_do_threshold():
    resultado = aplicar_k_anonimato(3, {"escore": 42}, threshold=5)
    assert resultado["resultado_disponivel"] is False
    # Regra inegociável: o valor nunca é retornado, mesmo existindo.
    assert resultado["valor_agregado"] is None


def test_resultado_oculto_com_zero_respostas():
    resultado = aplicar_k_anonimato(0, {"escore": 99}, threshold=5)
    assert resultado["resultado_disponivel"] is False
    assert resultado["valor_agregado"] is None


def test_threshold_alterado_reflete_imediatamente_na_mesma_leitura():
    # Mesmo n_respostas, thresholds diferentes -> disponibilidade diferente.
    # Simula a regra "aplicado no momento da consulta, não apenas na gravação".
    n_respostas = 4
    valor = {"escore": 10}
    assert aplicar_k_anonimato(n_respostas, valor, threshold=5)["resultado_disponivel"] is False
    assert aplicar_k_anonimato(n_respostas, valor, threshold=3)["resultado_disponivel"] is True
