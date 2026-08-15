from flask_openapi3 import APIBlueprint, Tag

from app.blueprints import erro_json
from app.extensions import db
from app.models.anonimo import Instituicao, Questionario, RespostaBruta, Setor
from app.schemas.comuns import respostas_erro
from app.schemas.publico import (
    EnviarRespostaBody,
    EnviarRespostaResponse,
    InstituicaoIdPath,
    ListaInstituicoesPublicasResponse,
    ListaSetoresPublicosResponse,
    QuestionarioAtivoQuery,
    QuestionarioAtivoResponse,
)
from app.services.k_anonimato import recalcular_resultados

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


@bp.get(
    "/questionarios/ativo",
    summary="Obter o questionário ativo",
    description=(
        "Retorna a estrutura de perguntas (domínios + itens) do questionário "
        "ativo no momento, para instituicao_id/setor_id validados. **Nunca** "
        "inclui `instrumento` nem `titulo` — o respondente não deve conseguir "
        "identificar qual instrumento (Karasek/COPSOQ) está sendo aplicado "
        "(docs/04-papeis-e-fluxos-de-usuario.md)."
    ),
    responses={200: QuestionarioAtivoResponse, **respostas_erro(400, 404)},
)
def obter_questionario_ativo(query: QuestionarioAtivoQuery):
    instituicao_id = query.instituicao_id
    setor_id = query.setor_id

    _, erro = _validar_instituicao_e_setor(instituicao_id, setor_id)
    if erro is not None:
        return erro

    # Simplificação do MVP: o modelo de dados (docs/03) não vincula
    # questionario a instituição/setor — existe um único questionário
    # ativo por vez, no sistema todo (garantido em
    # admin.py: ativar um questionário desativa os demais).
    questionario = (
        db.session.query(Questionario)
        .filter_by(ativo=True)
        .order_by(Questionario.criado_em.desc())
        .first()
    )
    if questionario is None:
        return erro_json(
            "questionario_indisponivel", "Nenhum questionário ativo no momento.", 404
        )

    return {
        "questionario_id": questionario.id,
        "dominios": [
            {
                "id": dominio.id,
                "ordem": dominio.ordem,
                "itens": [
                    {
                        "id": item.id,
                        "texto": item.texto,
                        "tipo_resposta": item.tipo_resposta,
                        "ordem": item.ordem,
                        "escala_min": item.escala_min,
                        "escala_max": item.escala_max,
                    }
                    for item in dominio.itens
                ],
            }
            for dominio in questionario.dominios
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
