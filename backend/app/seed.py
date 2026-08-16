import random
from datetime import datetime, timedelta, timezone

from app.auth.security import gerar_hash_senha
from app.extensions import db
from app.models.anonimo import Dominio, Instituicao, Item, Questionario, RespostaBruta, Setor
from app.models.auth import (
    PAPEL_ADMINISTRADOR,
    PAPEL_CONSULTOR,
    ConsultorInstituicao,
    LogAtividade,
    Usuario,
)
from app.models.memoria import InstituicaoReferencia, RegistroMemoria
from app.services.k_anonimato import recalcular_resultados

# Massa de dados fictícia para testar o sistema manualmente sem precisar
# preencher tudo na mão pelo painel do Administrador — instituições,
# setores, três questionários (Karasek, COPSOQ "encerrado" e um MISTO
# Karasek+COPSOQ intercalado, para demonstrar a funcionalidade), cada
# instituição vinculada a um questionário diferente (ou nenhum), respostas
# já cobrindo grupos acima E abaixo do threshold de k-anonimato (para testar
# tanto resultado visível quanto "dados insuficientes"), Consultores de
# teste e memória institucional.
#
# Nomes de instituição fictícios de propósito (não usar CIEP 052 nem
# outras instituições reais citadas em docs/ — misturar dado sintético
# com uma instituição real do projeto de mestrado seria confuso).
NOME_INSTITUICAO_1 = "Escola Técnica Horizonte Verde"
NOME_INSTITUICAO_2 = "CETEP Nova Aurora"
NOME_INSTITUICAO_3 = "Instituto Técnico Vale do Sol"

SENHA_DEMO = "senha123456"


def _agora():
    return datetime.now(timezone.utc)


def _data_aleatoria(dias_atras_max):
    return _agora() - timedelta(
        days=random.uniform(0, dias_atras_max), seconds=random.randint(0, 86399)
    )


def _jitter(media_alvo, minimo, maximo):
    valor = round(random.gauss(media_alvo, 0.6))
    return max(minimo, min(maximo, valor))


def _payload_por_dominios(alvos):
    """alvos: lista de (dominio, media_alvo_pos_inversao) -> payload
    {item_id: valor_bruto}, já invertendo itens `invertido` de volta para
    o valor bruto que o respondente teria digitado (ver
    InstrumentoEstrategia._valores_do_dominio)."""
    payload = {}
    for dominio, media_alvo in alvos:
        for item in dominio.itens:
            valor_pos_inversao = _jitter(media_alvo, item.escala_min, item.escala_max)
            valor_bruto = (
                (item.escala_min + item.escala_max) - valor_pos_inversao
                if item.invertido
                else valor_pos_inversao
            )
            payload[str(item.id)] = valor_bruto
    return payload


def _criar_instituicoes_e_setores():
    horizonte_verde = Instituicao(
        nome=NOME_INSTITUICAO_1, uf="SP", municipio="Campinas", ativo=True
    )
    nova_aurora = Instituicao(
        nome=NOME_INSTITUICAO_2, uf="MG", municipio="Belo Horizonte", ativo=True
    )
    vale_do_sol = Instituicao(
        nome=NOME_INSTITUICAO_3, uf="RS", municipio="Porto Alegre", ativo=True
    )
    db.session.add_all([horizonte_verde, nova_aurora, vale_do_sol])
    db.session.flush()

    for instituicao in (horizonte_verde, nova_aurora, vale_do_sol):
        db.session.add(
            InstituicaoReferencia(instituicao_id=instituicao.id, nome=instituicao.nome)
        )

    setores = {
        "hv_docentes": Setor(instituicao_id=horizonte_verde.id, nome="Corpo Docente", ativo=True),
        "hv_coordenacao": Setor(
            instituicao_id=horizonte_verde.id, nome="Coordenação Pedagógica", ativo=True
        ),
        "hv_secretaria": Setor(
            instituicao_id=horizonte_verde.id, nome="Secretaria Escolar", ativo=True
        ),
        "na_docentes": Setor(instituicao_id=nova_aurora.id, nome="Corpo Docente", ativo=True),
        "na_direcao": Setor(instituicao_id=nova_aurora.id, nome="Direção", ativo=True),
        "vs_docentes": Setor(instituicao_id=vale_do_sol.id, nome="Corpo Docente", ativo=True),
    }
    db.session.add_all(setores.values())
    db.session.flush()

    instituicoes = {
        "horizonte_verde": horizonte_verde,
        "nova_aurora": nova_aurora,
        "vale_do_sol": vale_do_sol,
    }
    return instituicoes, setores


def _criar_questionario_karasek():
    questionario = Questionario(
        titulo="Pesquisa de Riscos Psicossociais 2026.1",
        versao="1.0",
        ativo=True,
        modo_apresentacao="blocos",
    )
    db.session.add(questionario)
    db.session.flush()

    dominio_demanda = Dominio(
        questionario_id=questionario.id,
        nome="Demanda Psicológica",
        instrumento="karasek",
        chave="demanda",
        ordem=0,
    )
    dominio_controle = Dominio(
        questionario_id=questionario.id,
        nome="Controle sobre o Trabalho",
        instrumento="karasek",
        chave="controle",
        ordem=1,
    )
    db.session.add_all([dominio_demanda, dominio_controle])
    db.session.flush()

    db.session.add_all(
        [
            Item(
                dominio_id=dominio_demanda.id,
                texto="Meu trabalho exige que eu faça tarefas muito rapidamente.",
                ordem=0,
                escala_min=1,
                escala_max=5,
            ),
            Item(
                dominio_id=dominio_demanda.id,
                texto="Tenho tempo suficiente para dar conta de todas as minhas tarefas.",
                ordem=1,
                escala_min=1,
                escala_max=5,
                invertido=True,
            ),
            Item(
                dominio_id=dominio_demanda.id,
                texto="Meu trabalho exige um grande esforço mental e emocional.",
                ordem=2,
                escala_min=1,
                escala_max=5,
            ),
            Item(
                dominio_id=dominio_controle.id,
                texto="Tenho liberdade para decidir como organizar as atividades do meu trabalho.",
                ordem=0,
                escala_min=1,
                escala_max=5,
            ),
            Item(
                dominio_id=dominio_controle.id,
                texto="Posso influenciar decisões que afetam diretamente o meu trabalho.",
                ordem=1,
                escala_min=1,
                escala_max=5,
            ),
            Item(
                dominio_id=dominio_controle.id,
                texto="Tenho poucas oportunidades de aprender coisas novas no meu trabalho.",
                ordem=2,
                escala_min=1,
                escala_max=5,
                invertido=True,
            ),
        ]
    )
    db.session.flush()

    return questionario, dominio_demanda, dominio_controle


def _criar_questionario_copsoq():
    questionario = Questionario(
        titulo="Pesquisa de Riscos Psicossociais 2025.2 (encerrada)",
        versao="1.0",
        ativo=False,
        modo_apresentacao="blocos",
    )
    db.session.add(questionario)
    db.session.flush()

    dominio_exigencias = Dominio(
        questionario_id=questionario.id,
        nome="Exigências no Trabalho",
        instrumento="copsoq",
        chave="exigencias",
        ordem=0,
    )
    dominio_organizacao = Dominio(
        questionario_id=questionario.id,
        nome="Organização do Trabalho",
        instrumento="copsoq",
        chave="organizacao",
        ordem=1,
    )
    dominio_relacoes = Dominio(
        questionario_id=questionario.id,
        nome="Relações Sociais e Liderança",
        instrumento="copsoq",
        chave="relacoes",
        ordem=2,
    )
    db.session.add_all([dominio_exigencias, dominio_organizacao, dominio_relacoes])
    db.session.flush()

    # Convenção do COPSOQ (docs/06): escore mais alto = mais favorável.
    # Itens fraseados como problema (ex.: "preciso trabalhar rapidamente")
    # são `invertido=True` para que concordar bastante REDUZA o escore.
    db.session.add_all(
        [
            Item(
                dominio_id=dominio_exigencias.id,
                texto="Preciso trabalhar muito rapidamente.",
                ordem=0,
                escala_min=1,
                escala_max=5,
                invertido=True,
            ),
            Item(
                dominio_id=dominio_exigencias.id,
                texto="Minha carga de trabalho está distribuída de forma desigual ao longo do tempo.",
                ordem=1,
                escala_min=1,
                escala_max=5,
                invertido=True,
            ),
            Item(
                dominio_id=dominio_exigencias.id,
                texto="Consigo equilibrar minha vida pessoal com as demandas do trabalho.",
                ordem=2,
                escala_min=1,
                escala_max=5,
            ),
            Item(
                dominio_id=dominio_organizacao.id,
                texto="Tenho clareza sobre quais são minhas responsabilidades no trabalho.",
                ordem=0,
                escala_min=1,
                escala_max=5,
            ),
            Item(
                dominio_id=dominio_organizacao.id,
                texto="Recebo informações claras sobre mudanças que afetam meu trabalho.",
                ordem=1,
                escala_min=1,
                escala_max=5,
            ),
            Item(
                dominio_id=dominio_relacoes.id,
                texto="Posso contar com apoio da minha chefia quando preciso.",
                ordem=0,
                escala_min=1,
                escala_max=5,
            ),
            Item(
                dominio_id=dominio_relacoes.id,
                texto="Sinto-me tratado(a) com respeito no ambiente de trabalho.",
                ordem=1,
                escala_min=1,
                escala_max=5,
            ),
        ]
    )
    db.session.flush()

    return questionario, dominio_exigencias, dominio_organizacao, dominio_relacoes


TITULO_QUESTIONARIO_MISTO = "Pesquisa de Riscos Psicossociais 2026.2 (piloto misto)"


def _criar_questionario_misto_se_nao_existir():
    """Wrapper idempotente de `_criar_questionario_misto()` para quem chama
    fora do fluxo de `seed_dev_data()` (que já tem seu próprio gate — ver
    `seed_questionario_misto_demo()`). Retorna (None, None, None, None) se
    um questionário com esse título já existir."""
    existente = (
        db.session.query(Questionario).filter_by(titulo=TITULO_QUESTIONARIO_MISTO).first()
    )
    if existente is not None:
        return None, None, None, None
    return _criar_questionario_misto()


def _criar_questionario_misto():
    """Demonstra questionários mistos (docs/06): um único formulário
    combinando domínios de instrumentos diferentes (aqui, Karasek +
    COPSOQ), com modo_apresentacao="intercalado" para também mostrar essa
    opção — o respondente vê uma lista só, sem indicação de que há "duas
    partes"."""
    questionario = Questionario(
        titulo=TITULO_QUESTIONARIO_MISTO,
        versao="1.0",
        ativo=True,
        modo_apresentacao="intercalado",
    )
    db.session.add(questionario)
    db.session.flush()

    dominio_demanda = Dominio(
        questionario_id=questionario.id,
        nome="Demanda Psicológica",
        instrumento="karasek",
        chave="demanda",
        ordem=0,
    )
    dominio_controle = Dominio(
        questionario_id=questionario.id,
        nome="Controle sobre o Trabalho",
        instrumento="karasek",
        chave="controle",
        ordem=1,
    )
    dominio_relacoes = Dominio(
        questionario_id=questionario.id,
        nome="Relações Sociais e Liderança",
        instrumento="copsoq",
        chave="relacoes",
        ordem=2,
    )
    db.session.add_all([dominio_demanda, dominio_controle, dominio_relacoes])
    db.session.flush()

    db.session.add_all(
        [
            Item(
                dominio_id=dominio_demanda.id,
                texto="Meu trabalho exige que eu faça tarefas muito rapidamente.",
                ordem=0,
                escala_min=1,
                escala_max=5,
            ),
            Item(
                dominio_id=dominio_demanda.id,
                texto="Meu trabalho exige um grande esforço mental e emocional.",
                ordem=1,
                escala_min=1,
                escala_max=5,
            ),
            Item(
                dominio_id=dominio_controle.id,
                texto="Tenho liberdade para decidir como organizar as atividades do meu trabalho.",
                ordem=0,
                escala_min=1,
                escala_max=5,
            ),
            Item(
                dominio_id=dominio_controle.id,
                texto="Posso influenciar decisões que afetam diretamente o meu trabalho.",
                ordem=1,
                escala_min=1,
                escala_max=5,
            ),
            Item(
                dominio_id=dominio_relacoes.id,
                texto="Posso contar com apoio da minha chefia quando preciso.",
                ordem=0,
                escala_min=1,
                escala_max=5,
            ),
            Item(
                dominio_id=dominio_relacoes.id,
                texto="Sinto-me tratado(a) com respeito no ambiente de trabalho.",
                ordem=1,
                escala_min=1,
                escala_max=5,
            ),
        ]
    )
    db.session.flush()

    return questionario, dominio_demanda, dominio_controle, dominio_relacoes


def _gerar_respostas(instituicoes, setores, karasek_info, copsoq_info, misto_info):
    karasek, dominio_demanda, dominio_controle = karasek_info
    copsoq, dominio_exigencias, dominio_organizacao, dominio_relacoes = copsoq_info
    misto, dominio_misto_demanda, dominio_misto_controle, dominio_misto_relacoes = misto_info

    # (instituicao, setor, quantidade, media_demanda, media_controle, dias_atras_max)
    # Threshold padrão = 5 (K_ANONIMATO_THRESHOLD_DEFAULT): grupos com
    # quantidade < 5 ficam de propósito abaixo do threshold, para testar
    # o estado "dados insuficientes" tanto quanto o visível.
    grupos_karasek = [
        (instituicoes["horizonte_verde"], setores["hv_docentes"], 9, 4.3, 1.8, 6),
        (instituicoes["horizonte_verde"], setores["hv_coordenacao"], 6, 2.0, 4.2, 20),
        (instituicoes["horizonte_verde"], setores["hv_secretaria"], 3, 3.0, 3.0, 15),
        (instituicoes["nova_aurora"], setores["na_docentes"], 5, 3.4, 2.6, 25),
        (instituicoes["nova_aurora"], setores["na_direcao"], 2, 2.5, 3.5, 10),
        # vale_do_sol / na_docentes ficam sem nenhuma resposta de propósito
        # (testa instituição/setor com dado zerado nas telas do sistema).
    ]
    for instituicao, setor, quantidade, media_demanda, media_controle, dias_atras_max in grupos_karasek:
        for _ in range(quantidade):
            payload = _payload_por_dominios(
                [(dominio_demanda, media_demanda), (dominio_controle, media_controle)]
            )
            db.session.add(
                RespostaBruta(
                    questionario_id=karasek.id,
                    instituicao_id=instituicao.id,
                    setor_id=setor.id,
                    payload_json=payload,
                    respondido_em=_data_aleatoria(dias_atras_max),
                )
            )

    # (instituicao, setor, quantidade, media_exigencias, media_organizacao, media_relacoes, dias_atras_max)
    grupos_copsoq = [
        (instituicoes["horizonte_verde"], setores["hv_docentes"], 7, 1.8, 3.0, 4.4, 60),
        (instituicoes["nova_aurora"], setores["na_docentes"], 4, 2.8, 3.2, 3.6, 70),
    ]
    for (
        instituicao,
        setor,
        quantidade,
        media_exigencias,
        media_organizacao,
        media_relacoes,
        dias_atras_max,
    ) in grupos_copsoq:
        for _ in range(quantidade):
            payload = _payload_por_dominios(
                [
                    (dominio_exigencias, media_exigencias),
                    (dominio_organizacao, media_organizacao),
                    (dominio_relacoes, media_relacoes),
                ]
            )
            db.session.add(
                RespostaBruta(
                    questionario_id=copsoq.id,
                    instituicao_id=instituicao.id,
                    setor_id=setor.id,
                    payload_json=payload,
                    respondido_em=_data_aleatoria(dias_atras_max),
                )
            )

    # (instituicao, setor, quantidade, media_demanda, media_controle, media_relacoes, dias_atras_max)
    # Questionário misto (Karasek + COPSOQ juntos, intercalado) — exercita o
    # merge de resultados em services/k_anonimato.py:recalcular_resultados.
    grupos_misto = [
        (instituicoes["horizonte_verde"], setores["hv_docentes"], 8, 4.0, 2.0, 4.0, 5),
    ]
    for (
        instituicao,
        setor,
        quantidade,
        media_demanda,
        media_controle,
        media_relacoes,
        dias_atras_max,
    ) in grupos_misto:
        for _ in range(quantidade):
            payload = _payload_por_dominios(
                [
                    (dominio_misto_demanda, media_demanda),
                    (dominio_misto_controle, media_controle),
                    (dominio_misto_relacoes, media_relacoes),
                ]
            )
            db.session.add(
                RespostaBruta(
                    questionario_id=misto.id,
                    instituicao_id=instituicao.id,
                    setor_id=setor.id,
                    payload_json=payload,
                    respondido_em=_data_aleatoria(dias_atras_max),
                )
            )

    db.session.commit()

    # recalcular_resultados lê as RespostaBruta recém-commitadas e faz o
    # upsert em resultados_agregados — mesma função usada em produção após
    # cada POST /respostas (app/blueprints/publico.py).
    for instituicao, setor, *_ in grupos_karasek:
        recalcular_resultados(instituicao.id, setor.id, karasek.id)
    for instituicao, setor, *_ in grupos_copsoq:
        recalcular_resultados(instituicao.id, setor.id, copsoq.id)
    for instituicao, setor, *_ in grupos_misto:
        recalcular_resultados(instituicao.id, setor.id, misto.id)


def _criar_consultores(instituicoes):
    dados = [
        ("Consultora Demo Um", "consultor.um@exemplo.com", [instituicoes["horizonte_verde"]]),
        (
            "Consultor Demo Dois",
            "consultor.dois@exemplo.com",
            [instituicoes["nova_aurora"], instituicoes["vale_do_sol"]],
        ),
        ("Consultora Demo Três", "consultor.tres@exemplo.com", list(instituicoes.values())),
    ]
    criados = []
    for nome, email, instituicoes_vinculadas in dados:
        usuario = db.session.query(Usuario).filter_by(email=email).first()
        if usuario is None:
            usuario = Usuario(
                nome=nome,
                email=email,
                senha_hash=gerar_hash_senha(SENHA_DEMO),
                papel=PAPEL_CONSULTOR,
                ativo=True,
            )
            db.session.add(usuario)
            db.session.flush()

        for instituicao in instituicoes_vinculadas:
            vinculo_existe = (
                db.session.query(ConsultorInstituicao)
                .filter_by(usuario_id=usuario.id, instituicao_id=instituicao.id)
                .first()
            )
            if vinculo_existe is None:
                db.session.add(
                    ConsultorInstituicao(usuario_id=usuario.id, instituicao_id=instituicao.id)
                )
        criados.append(usuario)
    return criados


def _criar_memoria_institucional(instituicoes, admin):
    autor_id = admin.id if admin is not None else None
    registros = [
        (
            instituicoes["horizonte_verde"],
            "roda_de_conversa",
            "Roda de conversa sobre carga horária docente",
            "Encontro com o corpo docente para discutir a sobrecarga de trabalho identificada "
            "na última aplicação do questionário.",
        ),
        (
            instituicoes["horizonte_verde"],
            "acao_realizada",
            "Redistribuição de horários de coordenação",
            "Ajuste na grade de horários para reduzir a concentração de aulas em um mesmo turno.",
        ),
        (
            instituicoes["horizonte_verde"],
            "documento",
            "Ata da reunião sobre gestão de riscos (NR-1)",
            "Registro da reunião do comitê interno responsável pelo acompanhamento dos riscos "
            "psicossociais.",
        ),
        (
            instituicoes["nova_aurora"],
            "roda_de_conversa",
            "Escuta com a equipe de direção",
            "Conversa inicial com a direção após a primeira aplicação do questionário na "
            "instituição.",
        ),
        (
            instituicoes["nova_aurora"],
            "acao_realizada",
            "Criação de canal de escuta anônimo",
            "Implementação de caixa de sugestões física na sala dos professores.",
        ),
        # vale_do_sol fica sem registro de memória de propósito (testa
        # instituição sem histórico ainda).
    ]
    for instituicao, tipo, titulo, descricao in registros:
        existe = (
            db.session.query(RegistroMemoria)
            .filter_by(instituicao_id=instituicao.id, titulo=titulo)
            .first()
        )
        if existe is None:
            db.session.add(
                RegistroMemoria(
                    instituicao_id=instituicao.id,
                    tipo=tipo,
                    titulo=titulo,
                    descricao=descricao,
                    criado_por_usuario_id=autor_id,
                )
            )


def _criar_logs_demo(admin, instituicoes, karasek, consultores):
    if admin is None:
        return

    eventos = [
        ("criar_instituicao", "instituicao", instituicoes["horizonte_verde"].id, 6),
        ("criar_instituicao", "instituicao", instituicoes["nova_aurora"].id, 6),
        ("criar_instituicao", "instituicao", instituicoes["vale_do_sol"].id, 6),
        ("criar_questionario", "questionario", karasek.id, 5),
        ("criar_usuario", "usuario", consultores[0].id, 3),
        ("criar_usuario", "usuario", consultores[1].id, 3),
        ("criar_usuario", "usuario", consultores[2].id, 2),
        ("vincular_usuario_instituicoes", "usuario", consultores[2].id, 2),
    ]
    for acao, entidade, entidade_id, dias_atras in eventos:
        db.session.add(
            LogAtividade(
                usuario_id=admin.id,
                acao=acao,
                entidade=entidade,
                entidade_id=entidade_id,
                criado_em=_agora() - timedelta(days=dias_atras),
            )
        )


def seed_dev_data() -> bool:
    """Popula os 3 bancos com uma massa de dados fictícia para testes
    manuais. Idempotente por checagem simples (nome-marcador de
    instituição): se os dados de teste já existem, não faz nada e retorna
    False. Não recria o Administrador — usa `flask bootstrap-admin` para
    isso; se nenhum Administrador existir ainda, o log de atividade e a
    autoria dos registros de memória ficam só parcialmente preenchidos."""
    ja_existe = (
        db.session.query(Instituicao).filter_by(nome=NOME_INSTITUICAO_1).first() is not None
    )
    if ja_existe:
        return False

    random.seed(42)  # reprodutível entre execuções, para telas/capturas consistentes

    instituicoes, setores = _criar_instituicoes_e_setores()
    karasek_info = _criar_questionario_karasek()
    copsoq_info = _criar_questionario_copsoq()
    misto_info = _criar_questionario_misto()
    db.session.commit()

    # Vínculo instituição → questionário (Instituicao.questionario_id):
    # substitui a antiga regra de "só existe um questionário ativo no
    # sistema todo" — cada instituição escolhe o seu. horizonte_verde usa o
    # questionário misto (vitrine da funcionalidade), nova_aurora usa o
    # Karasek, e vale_do_sol fica sem nenhum vinculado de propósito (testa
    # o estado "instituição sem questionário" no fluxo público, além de já
    # testar "zero respostas" nos dashboards).
    instituicoes["horizonte_verde"].questionario_id = misto_info[0].id
    instituicoes["nova_aurora"].questionario_id = karasek_info[0].id

    _gerar_respostas(instituicoes, setores, karasek_info, copsoq_info, misto_info)

    admin = db.session.query(Usuario).filter_by(papel=PAPEL_ADMINISTRADOR).first()
    consultores = _criar_consultores(instituicoes)
    _criar_memoria_institucional(instituicoes, admin)
    _criar_logs_demo(admin, instituicoes, karasek_info[0], consultores)
    db.session.commit()

    return True


def _setor_por_nome(instituicao_id, nome):
    return db.session.query(Setor).filter_by(instituicao_id=instituicao_id, nome=nome).first()


def seed_questionario_misto_demo() -> bool:
    """Cria só o questionário misto de demonstração (Karasek + COPSOQ no
    mesmo formulário, intercalado) com respostas de teste — sem tocar em
    nenhum dado já existente. Complementa `seed_dev_data()` para quem já
    tinha rodado a seed antes do questionário misto existir (essa função é
    idempotente pelo título do questionário, não pelo nome de instituição,
    então roda mesmo se `seed_dev_data()` já rodou há tempos). Reaproveita
    as instituições/setores de `seed_dev_data()` se existirem — se não
    existirem, cria só o questionário, sem respostas de teste."""
    questionario, dominio_demanda, dominio_controle, dominio_relacoes = (
        _criar_questionario_misto_se_nao_existir()
    )
    if questionario is None:
        return False

    db.session.commit()

    horizonte_verde = db.session.query(Instituicao).filter_by(nome=NOME_INSTITUICAO_1).first()
    nova_aurora = db.session.query(Instituicao).filter_by(nome=NOME_INSTITUICAO_2).first()

    # (instituicao, setor, quantidade, media_demanda, media_controle, media_relacoes, dias_atras_max)
    # Um grupo acima do threshold padrão (5) e um abaixo, para testar tanto
    # o resultado visível quanto o estado "dados insuficientes" também no
    # questionário misto.
    grupos_misto = []
    if horizonte_verde is not None:
        setor = _setor_por_nome(horizonte_verde.id, "Coordenação Pedagógica")
        if setor is not None:
            grupos_misto.append((horizonte_verde, setor, 8, 2.0, 4.2, 4.0, 5))
    if nova_aurora is not None:
        setor = _setor_por_nome(nova_aurora.id, "Direção")
        if setor is not None:
            grupos_misto.append((nova_aurora, setor, 3, 3.6, 2.4, 2.8, 3))

    for (
        instituicao,
        setor,
        quantidade,
        media_demanda,
        media_controle,
        media_relacoes,
        dias_atras_max,
    ) in grupos_misto:
        for _ in range(quantidade):
            payload = _payload_por_dominios(
                [
                    (dominio_demanda, media_demanda),
                    (dominio_controle, media_controle),
                    (dominio_relacoes, media_relacoes),
                ]
            )
            db.session.add(
                RespostaBruta(
                    questionario_id=questionario.id,
                    instituicao_id=instituicao.id,
                    setor_id=setor.id,
                    payload_json=payload,
                    respondido_em=_data_aleatoria(dias_atras_max),
                )
            )

    # Só vincula automaticamente se a instituição ainda não tinha nenhum
    # questionário vinculado — nunca sobrescreve um vínculo que o
    # Administrador já tenha configurado manualmente.
    if horizonte_verde is not None and horizonte_verde.questionario_id is None:
        horizonte_verde.questionario_id = questionario.id

    db.session.commit()

    for instituicao, setor, *_ in grupos_misto:
        recalcular_resultados(instituicao.id, setor.id, questionario.id)

    return True
