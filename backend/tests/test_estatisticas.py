from app.services.estatisticas import contar_grupos_abaixo_threshold, montar_totais


def test_montar_totais_conta_ativos_e_papeis():
    totais = montar_totais(
        instituicoes_ativo=[True, True, False],
        questionarios_ativo=[True, False, False],
        usuarios_papel=["consultor", "consultor", "administrador"],
    )
    assert totais["instituicoes"] == {"total": 3, "ativas": 2}
    assert totais["questionarios"] == {"total": 3, "ativos": 1}
    assert totais["usuarios"] == {"consultores": 2, "administradores": 1}


def test_montar_totais_com_listas_vazias():
    totais = montar_totais([], [], [])
    assert totais["instituicoes"] == {"total": 0, "ativas": 0}
    assert totais["questionarios"] == {"total": 0, "ativos": 0}
    assert totais["usuarios"] == {"consultores": 0, "administradores": 0}


def test_contar_grupos_abaixo_threshold_considera_so_grupos_com_ao_menos_uma_resposta():
    # 0 -> nenhuma resposta ainda, não "está esperando" nada, não conta;
    # 2 e 4 -> abaixo do threshold (5), contam; 5 e 10 -> já disponíveis.
    assert contar_grupos_abaixo_threshold([0, 2, 4, 5, 10], threshold=5) == 2


def test_contar_grupos_abaixo_threshold_zero_quando_todos_atingem_ou_nenhum_respondeu():
    assert contar_grupos_abaixo_threshold([5, 6, 10], threshold=5) == 0
    assert contar_grupos_abaixo_threshold([0, 0, 0], threshold=5) == 0


def test_contar_grupos_abaixo_threshold_lista_vazia():
    assert contar_grupos_abaixo_threshold([], threshold=5) == 0
