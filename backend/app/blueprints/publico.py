# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

from itertools import zip_longest

from flask_openapi3 import APIBlueprint, Tag

from app.blueprints import erro_json
from app.extensions import db
from app.models.anonimo import Instituicao, Questionario, RespostaBruta, Setor
from app.schemas.comuns import respostas_erro
from app.schemas.publico import (
    ConfiguracoesPublicasResponse,
    EnviarRespostaBody,
    EnviarRespostaResponse,
    InstituicaoIdPath,
    ListaInstituicoesPublicasResponse,
    ListaSetoresPublicosResponse,
    QuestionarioAtivoQuery,
    QuestionarioAtivoResponse,
)
from app.services.k_anonimato import obter_configuracao, recalcular_resultados

# Rotas sem autenticação. O Usuário respondente nunca vê o nome do
# instrumento, cálculo de quadrante/domínio ou qualquer dado agregado
# (docs/04) — os payloads aqui nunca incluem `instrumento` nem resultados.
tag = Tag(
    name="Público",
    description=(
        "Rotas sem autenticação, usadas pelo formulário público do Usuário "
        "respondente: seleção de instituição/setor e envio de respostas. "
        "Nenhuma delas revela o instrumento aplicado nem qualquer dado "
        "agregado/calculado."
    ),
)
bp = APIBlueprint("publico", __name__, abp_tags=[tag])


@bp.get(
    "/configuracoes-publicas",
    summary="Configurações do sistema seguras para expor sem login",
    description="Único subconjunto de configuracoes_sistema visível sem autenticação — hoje só o toggle do widget de acessibilidade.",
    responses={200: ConfiguracoesPublicasResponse},
)
def obter_configuracoes_publicas():
    config = obter_configuracao()
    return {"acessibilidade_widget_enabled": config.acessibilidade_widget_enabled}


@bp.get(
    "/instituicoes",
    summary="Listar instituições ativas",
    description="Popula o dropdown de instituição do formulário público. Retorna apenas instituições ativas.",
    responses={200: ListaInstituicoesPublicasResponse},
)
def listar_instituicoes():
    instituicoes = (
        db.session.query(Instituicao)
        .filter_by(ativo=True)
        .order_by(Instituicao.nome)
        .all()
    )
    return [
        {"id": i.id, "nome": i.nome, "uf": i.uf, "municipio": i.municipio}
        for i in instituicoes
    ]


@bp.get(
    "/instituicoes/<int:instituicao_id>/setores",
    summary="Listar setores ativos de uma instituição",
    description="Popula o dropdown de setor, filtrado pela instituição escolhida no passo anterior.",
    responses={200: ListaSetoresPublicosResponse, **respostas_erro(404)},
)
def listar_setores(path: InstituicaoIdPath):
    instituicao_id = path.instituicao_id
    instituicao = db.session.get(Instituicao, instituicao_id)
    if instituicao is None or not instituicao.ativo:
        return erro_json("instituicao_nao_encontrada", "Instituição inválida.", 404)

    setores = (
        db.session.query(Setor)
        .filter_by(instituicao_id=instituicao_id, ativo=True)
        .order_by(Setor.nome)
        .all()
    )
    return [{"id": s.id, "nome": s.nome} for s in setores]


def _validar_instituicao_e_setor(instituicao_id, setor_id):
    instituicao = db.session.get(Instituicao, instituicao_id)
    if instituicao is None or not instituicao.ativo:
        return None, erro_json(
            "instituicao_invalida", "Instituição inexistente ou inativa.", 400
        )

    setor = db.session.get(Setor, setor_id)
    if setor is None or not setor.ativo or setor.instituicao_id != instituicao_id:
        return None, erro_json(
            "setor_invalido",
            "Setor inexistente, inativo ou não pertence à instituição informada.",
            400,
        )

    return (instituicao, setor), None


def _montar_itens_em_ordem(questionario):
    """Ordem final de apresentação dos itens ao respondente, sem revelar
    domínio/instrumento (docs/04): 'blocos' concatena os domínios (na ordem
    cadastrada) e dentro de cada um os itens (na ordem cadastrada);
    'intercalado' alterna item a item entre os domínios (round-robin) — usado
    sobretudo em questionários mistos, para não deixar visível que os itens
    vêm de instrumentos diferentes."""
    dominios_ordenados = sorted(questionario.dominios, key=lambda d: d.ordem)

    if questionario.modo_apresentacao != "intercalado":
        return [
            item
            for dominio in dominios_ordenados
            for item in sorted(dominio.itens, key=lambda i: i.ordem)
        ]

    filas = [sorted(dominio.itens, key=lambda i: i.ordem) for dominio in dominios_ordenados]
    return [item for grupo in zip_longest(*filas) for item in grupo if item is not None]


@bp.get(
    "/questionarios/ativo",
    summary="Obter o questionário vinculado à instituição",
    description=(
        "Retorna a lista de itens (já na ordem final de apresentação — "
        "blocos ou intercalado, ver Questionario.modo_apresentacao) do "
        "questionário vinculado à instituição informada "
        "(Instituicao.questionario_id). **Nunca** inclui `instrumento`, "
        "`dominio` nem `titulo` — o respondente não deve conseguir "
        "identificar qual(is) instrumento(s) (Karasek/COPSOQ) está(ão) "
        "sendo aplicado(s) (docs/04-papeis-e-fluxos-de-usuario.md)."
    ),
    responses={200: QuestionarioAtivoResponse, **respostas_erro(400, 404)},
)
def obter_questionario_ativo(query: QuestionarioAtivoQuery):
    instituicao_id = query.instituicao_id
    setor_id = query.setor_id

    resultado, erro = _validar_instituicao_e_setor(instituicao_id, setor_id)
    if erro is not None:
        return erro
    instituicao, _setor = resultado

    questionario = None
    if instituicao.questionario_id is not None:
        questionario = db.session.get(Questionario, instituicao.questionario_id)

    if questionario is None or not questionario.ativo:
        return erro_json(
            "questionario_indisponivel",
            "Nenhum questionário vinculado a esta instituição no momento.",
            404,
        )

    return {
        "questionario_id": questionario.id,
        "itens": [
            {
                "id": item.id,
                "texto": item.texto,
                "tipo_resposta": item.tipo_resposta,
                "escala_min": item.escala_min,
                "escala_max": item.escala_max,
                "regra_condicional": item.regra_condicional,
            }
            for item in _montar_itens_em_ordem(questionario)
        ],
    }


@bp.post(
    "/respostas",
    summary="Enviar respostas de um questionário",
    description=(
        "Grava uma resposta anônima (`respostas_brutas`) e recalcula os "
        "resultados agregados do grupo instituição+setor+questionário "
        "(app/services/k_anonimato.py:recalcular_resultados). O payload "
        "`respostas` nunca deve conter nenhum campo identificador do "
        "respondente — apenas {item_id: valor}."
    ),
    responses={201: EnviarRespostaResponse, **respostas_erro(400)},
)
def enviar_resposta(body: EnviarRespostaBody):
    questionario_id = body.questionario_id
    instituicao_id = body.instituicao_id
    setor_id = body.setor_id
    respostas = body.respostas

    _, erro = _validar_instituicao_e_setor(instituicao_id, setor_id)
    if erro is not None:
        return erro

    questionario = db.session.get(Questionario, questionario_id)
    if questionario is None or not questionario.ativo:
        return erro_json(
            "questionario_invalido", "Questionário inexistente ou inativo.", 400
        )

    itens_validos = {
        str(item.id)
        for dominio in questionario.dominios
        for item in dominio.itens
    }
    if not set(respostas.keys()).issubset(itens_validos):
        return erro_json(
            "itens_invalidos",
            "O payload contém itens que não pertencem a este questionário.",
            400,
        )

    resposta = RespostaBruta(
        questionario_id=questionario_id,
        instituicao_id=instituicao_id,
        setor_id=setor_id,
        payload_json=respostas,
    )
    db.session.add(resposta)
    db.session.commit()

    recalcular_resultados(instituicao_id, setor_id, questionario_id)

    return {"confirmado": True}, 201
