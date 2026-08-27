# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from flask import Response, g, request
from flask_openapi3 import APIBlueprint, Tag
from sqlalchemy import func

from app.auth.decorators import requer_papel
from app.auth.security import gerar_hash_senha, verificar_senha
from app.blueprints import erro_json
from app.extensions import db
from app.models.anonimo import Dominio, Instituicao, Item, Questionario, RespostaBruta, ResultadoAgregado, Setor
from app.models.auth import (
    PAPEIS_VALIDOS,
    PAPEL_ADMINISTRADOR,
    ConsultorInstituicao,
    LogAtividade,
    SessaoLogin,
    Usuario,
)
from app.models.memoria import InstituicaoReferencia, RegistroMemoria
from app.schemas.admin import (
    AtualizarConfiguracoesBody,
    ConfiguracoesResponse,
    CriarInstituicaoBody,
    CriarQuestionarioBody,
    CriarSetorBody,
    CriarUsuarioBody,
    EditarInstituicaoBody,
    EditarQuestionarioBody,
    EditarSetorBody,
    EditarUsuarioBody,
    EstatisticasResponse,
    ExportRespostasQuery,
    ExportResultadosInstituicaoQuery,
    FiltroResultadosQuery,
    FRASE_CONFIRMACAO_RESET,
    ListaInstituicoesAdminResponse,
    ListaLogsResponse,
    ListaMemoriaAdminResponse,
    ListaQuestionariosResponse,
    ListaResultadosDimensaoResponse,
    ListaSetoresAdminResponse,
    ListaUsuariosResponse,
    ListarLogsQuery,
    ListarMemoriaQuery,
    ListarSetoresQuery,
    MemoriaBody,
    QuestionarioIdPath,
    ResetarSistemaBody,
    SetorIdPath,
    UsuarioIdPath,
    UsuarioInstituicaoVinculoPath,
    VincularInstituicoesBody,
)
from app.schemas.comuns import ConfirmadoResponse, IdCriadoResponse, respostas_erro
from app.schemas.consultor import ListaResultadosResponse
from app.schemas.publico import InstituicaoIdPath
from app.services import reset_sistema
from app.services.estatisticas import contar_grupos_abaixo_threshold, gerar_relatorio_pdf, montar_totais
from app.services.exportacao import exportar_respostas_csv, formatar_csv, nome_arquivo_timestamp
from app.services.instrumentos import instrumento_invalido, instrumentos_disponiveis
from app.services.k_anonimato import (
    exportar_resultados_instituicao_csv,
    obter_configuracao,
    obter_resultados,
    obter_threshold,
)
from app.services.resultados_dashboard import exportar_resultados_csv, obter_resultados_dashboard

tag = Tag(
    name="Administrador",
    description=(
        "Rotas restritas ao papel 'administrador', autenticadas via "
        "`Authorization: Bearer <token>`. Acesso completo: cadastros, "
        "questionários, usuários, configurações, exportação e logs."
    ),
)
bp = APIBlueprint(
    "admin", __name__, url_prefix="/admin", abp_tags=[tag], abp_security=[{"bearerAuth": []}]
)


def _registrar_log(acao, entidade=None, entidade_id=None, detalhes=None):
    db.session.add(
        LogAtividade(
            usuario_id=g.usuario.id,
            acao=acao,
            entidade=entidade,
            entidade_id=entidade_id,
            detalhes=detalhes,
        )
    )


def _validar_questionario_vinculo(questionario_id):
    """None é válido (desvincula/nenhum vínculo). Se enviado, precisa
    apontar para um questionário existente e ativo (disponível)."""
    if questionario_id is None:
        return None
    questionario = db.session.get(Questionario, questionario_id)
    if questionario is None or not questionario.ativo:
        return erro_json(
            "questionario_invalido", "questionario_id inválido ou não disponível.", 400
        )
    return None


def _espelhar_instituicao_em_memoria(instituicao: Instituicao):
    espelho = (
        db.session.query(InstituicaoReferencia)
        .filter_by(instituicao_id=instituicao.id)
        .first()
    )
    if espelho is None:
        espelho = InstituicaoReferencia(instituicao_id=instituicao.id, nome=instituicao.nome)
        db.session.add(espelho)
    else:
        espelho.nome = instituicao.nome


# ---------------------------------------------------------------------------
# Instituições
# ---------------------------------------------------------------------------


@bp.get(
    "/instituicoes",
    summary="Listar todas as instituições",
    description="Ao contrário de GET /instituicoes (pública), inclui também instituições inativas.",
    responses={200: ListaInstituicoesAdminResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def listar_instituicoes():
    instituicoes = db.session.query(Instituicao).order_by(Instituicao.nome).all()
    return [
        {
            "id": i.id,
            "nome": i.nome,
            "uf": i.uf,
            "municipio": i.municipio,
            "ativo": i.ativo,
            "questionario_id": i.questionario_id,
        }
        for i in instituicoes
    ]


@bp.post(
    "/instituicoes",
    summary="Criar instituição",
    description="Também cria/atualiza o espelho leve em `instituicoes_referencia` (banco memória).",
    responses={201: IdCriadoResponse, **respostas_erro(400, 401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def criar_instituicao(body: CriarInstituicaoBody):
    nome = body.nome.strip()
    if not nome:
        return erro_json("payload_invalido", "O campo 'nome' é obrigatório.", 400)

    erro = _validar_questionario_vinculo(body.questionario_id)
    if erro is not None:
        return erro

    instituicao = Instituicao(
        nome=nome,
        uf=body.uf,
        municipio=body.municipio,
        ativo=True,
        questionario_id=body.questionario_id,
    )
    db.session.add(instituicao)
    db.session.flush()
    _espelhar_instituicao_em_memoria(instituicao)
    _registrar_log("criar_instituicao", "instituicao", instituicao.id)
    db.session.commit()
    return {"id": instituicao.id}, 201


@bp.put(
    "/instituicoes/<int:instituicao_id>",
    summary="Editar instituição",
    description="Só altera os campos enviados no payload (os demais permanecem inalterados).",
    responses={200: ConfirmadoResponse, **respostas_erro(401, 403, 404)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def editar_instituicao(path: InstituicaoIdPath, body: EditarInstituicaoBody):
    instituicao = db.session.get(Instituicao, path.instituicao_id)
    if instituicao is None:
        return erro_json("nao_encontrado", "Instituição não encontrada.", 404)

    dados = body.model_dump(exclude_unset=True)

    if "questionario_id" in dados:
        erro = _validar_questionario_vinculo(dados["questionario_id"])
        if erro is not None:
            return erro

    for campo in ("nome", "uf", "municipio", "ativo", "questionario_id"):
        if campo in dados:
            setattr(instituicao, campo, dados[campo])

    _espelhar_instituicao_em_memoria(instituicao)
    _registrar_log("editar_instituicao", "instituicao", instituicao.id, dados)
    db.session.commit()
    return {"confirmado": True}


@bp.delete(
    "/instituicoes/<int:instituicao_id>",
    summary="Desativar instituição",
    description=(
        "Soft delete apenas (`ativo = false`) — nunca DELETE físico nem "
        "cascade entre bancos (docs/03). A instituição para de aparecer nos "
        "dropdowns públicos, mas seus dados históricos são preservados."
    ),
    responses={200: ConfirmadoResponse, **respostas_erro(401, 403, 404)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def desativar_instituicao(path: InstituicaoIdPath):
    instituicao = db.session.get(Instituicao, path.instituicao_id)
    if instituicao is None:
        return erro_json("nao_encontrado", "Instituição não encontrada.", 404)

    instituicao.ativo = False
    _registrar_log("desativar_instituicao", "instituicao", instituicao.id)
    db.session.commit()
    return {"confirmado": True}


# ---------------------------------------------------------------------------
# Setores
# ---------------------------------------------------------------------------


@bp.get(
    "/setores",
    summary="Listar setores",
    description="Opcionalmente filtrado por instituicao_id. Inclui setores inativos.",
    responses={200: ListaSetoresAdminResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def listar_setores(query: ListarSetoresQuery):
    consulta = db.session.query(Setor)
    if query.instituicao_id is not None:
        consulta = consulta.filter_by(instituicao_id=query.instituicao_id)
    setores = consulta.order_by(Setor.nome).all()
    return [
        {
            "id": s.id,
            "instituicao_id": s.instituicao_id,
            "nome": s.nome,
            "ativo": s.ativo,
        }
        for s in setores
    ]


@bp.post(
    "/setores",
    summary="Criar setor",
    responses={201: IdCriadoResponse, **respostas_erro(400, 401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def criar_setor(body: CriarSetorBody):
    nome = body.nome.strip()
    instituicao = db.session.get(Instituicao, body.instituicao_id)
    if instituicao is None:
        return erro_json("instituicao_invalida", "instituicao_id inválido.", 400)
    if not nome:
        return erro_json("payload_invalido", "O campo 'nome' é obrigatório.", 400)

    setor = Setor(instituicao_id=body.instituicao_id, nome=nome, ativo=True)
    db.session.add(setor)
    db.session.flush()
    _registrar_log("criar_setor", "setor", setor.id)
    db.session.commit()
    return {"id": setor.id}, 201


@bp.put(
    "/setores/<int:setor_id>",
    summary="Editar setor",
    description="Só altera os campos enviados no payload.",
    responses={200: ConfirmadoResponse, **respostas_erro(401, 403, 404)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def editar_setor(path: SetorIdPath, body: EditarSetorBody):
    setor = db.session.get(Setor, path.setor_id)
    if setor is None:
        return erro_json("nao_encontrado", "Setor não encontrado.", 404)

    dados = body.model_dump(exclude_unset=True)
    for campo in ("nome", "ativo"):
        if campo in dados:
            setattr(setor, campo, dados[campo])

    _registrar_log("editar_setor", "setor", setor.id, dados)
    db.session.commit()
    return {"confirmado": True}


# ---------------------------------------------------------------------------
# Questionários / domínios / itens
# ---------------------------------------------------------------------------


def _validar_instrumentos_dominios(dominios_dados):
    nome_invalido = instrumento_invalido(dominios_dados)
    if nome_invalido is not None:
        return erro_json(
            "instrumento_invalido",
            f"Domínio '{nome_invalido}': instrumento deve ser um de: {instrumentos_disponiveis()}.",
            400,
        )
    return None


def _montar_dominios(questionario_id, dominios_dados):
    for ordem_dominio, dominio_dados in enumerate(dominios_dados or []):
        dominio = Dominio(
            questionario_id=questionario_id,
            nome=dominio_dados.get("nome", ""),
            instrumento=dominio_dados.get("instrumento", ""),
            chave=dominio_dados.get("chave", ""),
            ordem=dominio_dados.get("ordem", ordem_dominio),
        )
        db.session.add(dominio)
        db.session.flush()

        for ordem_item, item_dados in enumerate(dominio_dados.get("itens") or []):
            db.session.add(
                Item(
                    dominio_id=dominio.id,
                    texto=item_dados.get("texto", ""),
                    tipo_resposta=item_dados.get("tipo_resposta", "escala_likert"),
                    ordem=item_dados.get("ordem", ordem_item),
                    escala_min=item_dados.get("escala_min", 1),
                    escala_max=item_dados.get("escala_max", 5),
                    invertido=bool(item_dados.get("invertido", False)),
                    regra_condicional=item_dados.get("regra_condicional"),
                )
            )


def _serializar_questionario(questionario: Questionario):
    return {
        "id": questionario.id,
        "titulo": questionario.titulo,
        "instrumentos": sorted({dominio.instrumento for dominio in questionario.dominios}),
        "versao": questionario.versao,
        "ativo": questionario.ativo,
        "modo_apresentacao": questionario.modo_apresentacao,
        "dominios": [
            {
                "id": dominio.id,
                "nome": dominio.nome,
                "instrumento": dominio.instrumento,
                "chave": dominio.chave,
                "ordem": dominio.ordem,
                "itens": [
                    {
                        "id": item.id,
                        "texto": item.texto,
                        "tipo_resposta": item.tipo_resposta,
                        "ordem": item.ordem,
                        "escala_min": item.escala_min,
                        "escala_max": item.escala_max,
                        "invertido": item.invertido,
                        "regra_condicional": item.regra_condicional,
                    }
                    for item in dominio.itens
                ],
            }
            for dominio in questionario.dominios
        ],
    }


@bp.get(
    "/questionarios",
    summary="Listar questionários",
    description="Estrutura completa (domínios + itens) de todos os questionários, mais recentes primeiro.",
    responses={200: ListaQuestionariosResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def listar_questionarios():
    questionarios = db.session.query(Questionario).order_by(Questionario.criado_em.desc()).all()
    return [_serializar_questionario(q) for q in questionarios]


@bp.get(
    "/questionarios/export",
    summary="Exportar questionários (CSV)",
    description="Todos os questionários, uma linha por item (questionário × domínio × item) — nível que preserva o texto de cada item.",
    responses={200: {"content": {"text/csv": {"schema": {"type": "string"}}}}, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def exportar_questionarios():
    questionarios = db.session.query(Questionario).order_by(Questionario.criado_em.desc()).all()

    linhas = []
    for questionario in questionarios:
        if not questionario.dominios:
            linhas.append(
                [questionario.id, questionario.titulo, questionario.versao, questionario.ativo,
                 questionario.modo_apresentacao, "", "", "", "", "", "", "", "", "", "", "", ""]
            )
            continue
        for dominio in questionario.dominios:
            if not dominio.itens:
                linhas.append(
                    [questionario.id, questionario.titulo, questionario.versao, questionario.ativo,
                     questionario.modo_apresentacao, dominio.id, dominio.nome, dominio.instrumento,
                     dominio.chave, dominio.ordem, "", "", "", "", "", "", ""]
                )
                continue
            for item in dominio.itens:
                linhas.append(
                    [
                        questionario.id, questionario.titulo, questionario.versao, questionario.ativo,
                        questionario.modo_apresentacao, dominio.id, dominio.nome, dominio.instrumento,
                        dominio.chave, dominio.ordem, item.id, item.texto, item.tipo_resposta,
                        item.ordem, item.escala_min, item.escala_max, item.invertido,
                    ]
                )

    csv_texto = formatar_csv(
        [
            "questionario_id", "questionario_titulo", "versao", "ativo", "modo_apresentacao",
            "dominio_id", "dominio_nome", "dominio_instrumento", "dominio_chave", "dominio_ordem",
            "item_id", "item_texto", "item_tipo_resposta", "item_ordem", "escala_min", "escala_max",
            "invertido",
        ],
        linhas,
    )
    _registrar_log("exportar_questionarios_csv", "questionarios", detalhes={"total_linhas": len(linhas)})
    db.session.commit()

    nome_arquivo = nome_arquivo_timestamp("questionarios", "csv")
    return Response(
        csv_texto,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={nome_arquivo}"},
    )


MODOS_APRESENTACAO_VALIDOS = ("blocos", "intercalado")


@bp.post(
    "/questionarios",
    summary="Criar questionário",
    description=(
        "Cria um questionário com sua árvore completa de domínios e itens "
        "em uma única chamada. Cada domínio carrega seu próprio "
        "`instrumento` (um dos valores registrados em "
        "app/services/instrumentos — strategy pattern, docs/06), o que "
        "permite questionários mistos combinando domínios de instrumentos "
        "diferentes. `ativo` não é mais exclusivo: vários questionários "
        "podem estar ativos ao mesmo tempo, cada instituição escolhe o seu "
        "(ver PUT /admin/instituicoes/{id})."
    ),
    responses={201: IdCriadoResponse, **respostas_erro(400, 401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def criar_questionario(body: CriarQuestionarioBody):
    titulo = body.titulo.strip()

    if not titulo:
        return erro_json("payload_invalido", "O campo 'titulo' é obrigatório.", 400)
    if body.modo_apresentacao not in MODOS_APRESENTACAO_VALIDOS:
        return erro_json(
            "modo_apresentacao_invalido",
            f"modo_apresentacao deve ser um de: {MODOS_APRESENTACAO_VALIDOS}.",
            400,
        )

    dominios_dados = [d.model_dump(exclude_none=True) for d in body.dominios] if body.dominios else None
    erro = _validar_instrumentos_dominios(dominios_dados)
    if erro is not None:
        return erro

    questionario = Questionario(
        titulo=titulo,
        versao=body.versao,
        ativo=body.ativo,
        modo_apresentacao=body.modo_apresentacao,
    )
    db.session.add(questionario)
    db.session.flush()

    _montar_dominios(questionario.id, dominios_dados)
    _registrar_log("criar_questionario", "questionario", questionario.id)
    db.session.commit()
    return {"id": questionario.id}, 201


@bp.put(
    "/questionarios/<int:questionario_id>",
    summary="Editar questionário",
    description=(
        "Só altera os campos enviados no payload. Se `dominios` for "
        "enviado, SUBSTITUI COMPLETAMENTE os domínios/itens atuais (apaga "
        "e recria) — não faz merge parcial. `ativo` não é mais exclusivo: "
        "vários questionários podem estar ativos ao mesmo tempo."
    ),
    responses={200: ConfirmadoResponse, **respostas_erro(400, 401, 403, 404)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def editar_questionario(path: QuestionarioIdPath, body: EditarQuestionarioBody):
    questionario = db.session.get(Questionario, path.questionario_id)
    if questionario is None:
        return erro_json("nao_encontrado", "Questionário não encontrado.", 404)

    dados = body.model_dump(exclude_unset=True)

    if "modo_apresentacao" in dados and dados["modo_apresentacao"] not in MODOS_APRESENTACAO_VALIDOS:
        return erro_json(
            "modo_apresentacao_invalido",
            f"modo_apresentacao deve ser um de: {MODOS_APRESENTACAO_VALIDOS}.",
            400,
        )
    if "dominios" in dados:
        erro = _validar_instrumentos_dominios(dados["dominios"])
        if erro is not None:
            return erro

    for campo in ("titulo", "versao", "ativo", "modo_apresentacao"):
        if campo in dados:
            setattr(questionario, campo, dados[campo])

    if "dominios" in dados:
        # Substituição completa de domínios/itens — mais simples e previsível
        # que um diff parcial para um CRUD administrativo de MVP.
        for dominio in list(questionario.dominios):
            for item in list(dominio.itens):
                db.session.delete(item)
            db.session.delete(dominio)
        db.session.flush()
        _montar_dominios(questionario.id, dados["dominios"])

    _registrar_log("editar_questionario", "questionario", questionario.id)
    db.session.commit()
    return {"confirmado": True}


@bp.delete(
    "/questionarios/<int:questionario_id>",
    summary="Excluir questionário",
    description=(
        "Exclusão definitiva (domínios e itens em cascata). Só é permitida "
        "se o questionário não tiver nenhuma resposta registrada "
        "(respostas_brutas) — para nunca destruir dado histórico, um "
        "questionário já respondido não pode ser excluído, apenas "
        "desativado (PUT .../questionarios/{id} com `ativo: false`). "
        "Instituições vinculadas a ele (Instituicao.questionario_id) são "
        "automaticamente desvinculadas."
    ),
    responses={200: ConfirmadoResponse, **respostas_erro(400, 401, 403, 404)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def excluir_questionario(path: QuestionarioIdPath):
    questionario = db.session.get(Questionario, path.questionario_id)
    if questionario is None:
        return erro_json("nao_encontrado", "Questionário não encontrado.", 404)

    total_respostas = (
        db.session.query(func.count(RespostaBruta.id))
        .filter_by(questionario_id=questionario.id)
        .scalar()
    )
    if total_respostas > 0:
        return erro_json(
            "questionario_com_respostas",
            "Este questionário já tem respostas registradas e não pode ser excluído — "
            "desative-o em vez disso.",
            400,
        )

    db.session.query(Instituicao).filter_by(questionario_id=questionario.id).update(
        {"questionario_id": None}
    )

    for dominio in list(questionario.dominios):
        for item in list(dominio.itens):
            db.session.delete(item)
        db.session.delete(dominio)
    db.session.delete(questionario)

    _registrar_log("excluir_questionario", "questionario", questionario.id)
    db.session.commit()
    return {"confirmado": True}


# ---------------------------------------------------------------------------
# Usuários (Consultor / Administrador) e vínculos
# ---------------------------------------------------------------------------


@bp.get(
    "/usuarios",
    summary="Listar usuários",
    description=(
        "Nunca inclui `senha_hash`. Inclui as instituições vinculadas a "
        "cada Consultor (resolvidas em duas consultas — banco `auth` para "
        "os vínculos, banco `anonimo` para os nomes — nunca um JOIN "
        "direto entre bancos, ver docs/03). `ultima_interacao_em` é o mais "
        "recente entre o último login (`sessao_login`) e a última ação "
        "registrada em `log_atividade` — `null` se o usuário nunca fez login."
    ),
    responses={200: ListaUsuariosResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def listar_usuarios():
    usuarios = db.session.query(Usuario).order_by(Usuario.nome).all()

    vinculos = db.session.query(ConsultorInstituicao).all()
    instituicao_ids_por_usuario = defaultdict(list)
    for vinculo in vinculos:
        instituicao_ids_por_usuario[vinculo.usuario_id].append(vinculo.instituicao_id)

    todos_instituicao_ids = {
        instituicao_id
        for ids in instituicao_ids_por_usuario.values()
        for instituicao_id in ids
    }
    nomes_instituicao = {
        i.id: i.nome
        for i in db.session.query(Instituicao.id, Instituicao.nome)
        .filter(Instituicao.id.in_(todos_instituicao_ids))
        .all()
    }

    ultimo_login_por_usuario = dict(
        db.session.query(SessaoLogin.usuario_id, func.max(SessaoLogin.criado_em))
        .group_by(SessaoLogin.usuario_id)
        .all()
    )
    ultima_acao_por_usuario = dict(
        db.session.query(LogAtividade.usuario_id, func.max(LogAtividade.criado_em))
        .group_by(LogAtividade.usuario_id)
        .all()
    )

    def _ultima_interacao(usuario_id):
        candidatos = [
            data
            for data in (
                ultimo_login_por_usuario.get(usuario_id),
                ultima_acao_por_usuario.get(usuario_id),
            )
            if data is not None
        ]
        return max(candidatos) if candidatos else None

    return [
        {
            "id": u.id,
            "nome": u.nome,
            "email": u.email,
            "papel": u.papel,
            "ativo": u.ativo,
            "instituicoes": [
                {"id": instituicao_id, "nome": nomes_instituicao.get(instituicao_id, "?")}
                for instituicao_id in instituicao_ids_por_usuario.get(u.id, [])
            ],
            "ultima_interacao_em": _ultima_interacao(u.id),
        }
        for u in usuarios
    ]


@bp.post(
    "/usuarios",
    summary="Criar usuário (Consultor ou Administrador)",
    description="A senha é recebida em texto plano e imediatamente transformada em hash (bcrypt) antes de gravar.",
    responses={201: IdCriadoResponse, **respostas_erro(400, 401, 403, 409)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def criar_usuario(body: CriarUsuarioBody):
    nome = body.nome.strip()
    email = body.email.strip().lower()
    senha = body.senha
    papel = body.papel

    if not nome or not email or not senha:
        return erro_json("payload_invalido", "Informe nome, email e senha.", 400)
    if papel not in PAPEIS_VALIDOS:
        return erro_json("papel_invalido", f"papel deve ser um de: {PAPEIS_VALIDOS}.", 400)
    if db.session.query(Usuario).filter_by(email=email).first() is not None:
        return erro_json("email_em_uso", "Já existe um usuário com este e-mail.", 409)

    usuario = Usuario(
        nome=nome, email=email, senha_hash=gerar_hash_senha(senha), papel=papel, ativo=True
    )
    db.session.add(usuario)
    db.session.flush()
    _registrar_log("criar_usuario", "usuario", usuario.id, {"papel": papel})
    db.session.commit()
    return {"id": usuario.id}, 201


@bp.put(
    "/usuarios/<int:usuario_id>",
    summary="Editar usuário",
    description=(
        "Só altera os campos enviados no payload. Não altera senha (não há "
        "rota de reset de senha de terceiro — cada usuário troca a própria "
        "via PUT /auth/senha)."
    ),
    responses={200: ConfirmadoResponse, **respostas_erro(400, 401, 403, 404, 409)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def editar_usuario(path: UsuarioIdPath, body: EditarUsuarioBody):
    usuario = db.session.get(Usuario, path.usuario_id)
    if usuario is None:
        return erro_json("nao_encontrado", "Usuário não encontrado.", 404)

    dados = body.model_dump(exclude_unset=True)

    if "papel" in dados and dados["papel"] not in PAPEIS_VALIDOS:
        return erro_json("papel_invalido", f"papel deve ser um de: {PAPEIS_VALIDOS}.", 400)

    if "email" in dados:
        email = (dados["email"] or "").strip().lower()
        if not email:
            return erro_json("payload_invalido", "O campo 'email' não pode ficar vazio.", 400)
        existente = db.session.query(Usuario).filter_by(email=email).first()
        if existente is not None and existente.id != usuario.id:
            return erro_json("email_em_uso", "Já existe um usuário com este e-mail.", 409)
        dados["email"] = email

    if "nome" in dados:
        dados["nome"] = dados["nome"].strip()

    for campo in ("nome", "email", "papel", "ativo"):
        if campo in dados:
            setattr(usuario, campo, dados[campo])

    _registrar_log("editar_usuario", "usuario", usuario.id, dados)
    db.session.commit()
    return {"confirmado": True}


@bp.delete(
    "/usuarios/<int:usuario_id>",
    summary="Desativar usuário",
    description=(
        "Soft delete apenas (`ativo = false`) — nunca DELETE físico. O "
        "usuário desativado não consegue mais logar, mas seu log de "
        "atividade e vínculos consultor-instituição são preservados. Um "
        "Administrador não pode desativar a própria conta."
    ),
    responses={200: ConfirmadoResponse, **respostas_erro(400, 401, 403, 404)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def desativar_usuario(path: UsuarioIdPath):
    usuario = db.session.get(Usuario, path.usuario_id)
    if usuario is None:
        return erro_json("nao_encontrado", "Usuário não encontrado.", 404)
    if usuario.id == g.usuario.id:
        return erro_json(
            "acao_invalida", "Você não pode desativar sua própria conta.", 400
        )

    usuario.ativo = False
    _registrar_log("desativar_usuario", "usuario", usuario.id)
    db.session.commit()
    return {"confirmado": True}


@bp.post(
    "/usuarios/<int:usuario_id>/vinculos",
    summary="Vincular usuário a instituições",
    description=(
        "Adiciona vínculos consultor-instituição (N:N) — usado para dar a "
        "um Consultor acesso aos resultados/memória de instituições "
        "específicas. Vínculos já existentes são ignorados silenciosamente "
        "(idempotente)."
    ),
    responses={200: ConfirmadoResponse, **respostas_erro(400, 401, 403, 404)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def vincular_usuario_instituicoes(path: UsuarioIdPath, body: VincularInstituicoesBody):
    usuario = db.session.get(Usuario, path.usuario_id)
    if usuario is None:
        return erro_json("nao_encontrado", "Usuário não encontrado.", 404)

    instituicao_ids = body.instituicao_ids

    encontradas = {
        i.id
        for i in db.session.query(Instituicao.id)
        .filter(Instituicao.id.in_(instituicao_ids))
        .all()
    }
    invalidas = set(instituicao_ids) - encontradas
    if invalidas:
        return erro_json(
            "instituicoes_invalidas",
            "Algumas instituições não existem.",
            400,
            {"instituicao_ids_invalidos": list(invalidas)},
        )

    existentes = {
        v.instituicao_id
        for v in db.session.query(ConsultorInstituicao).filter_by(usuario_id=path.usuario_id).all()
    }
    for instituicao_id in instituicao_ids:
        if instituicao_id not in existentes:
            db.session.add(
                ConsultorInstituicao(usuario_id=path.usuario_id, instituicao_id=instituicao_id)
            )

    _registrar_log(
        "vincular_usuario_instituicoes",
        "usuario",
        path.usuario_id,
        {"instituicao_ids": instituicao_ids},
    )
    db.session.commit()
    return {"confirmado": True}


@bp.delete(
    "/usuarios/<int:usuario_id>/vinculos/<int:instituicao_id>",
    summary="Desvincular usuário de uma instituição",
    description=(
        "Remove um único vínculo consultor-instituição (N:N). Idempotente: "
        "se o vínculo não existir, ainda retorna sucesso."
    ),
    responses={200: ConfirmadoResponse, **respostas_erro(401, 403, 404)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def desvincular_usuario_instituicao(path: UsuarioInstituicaoVinculoPath):
    usuario = db.session.get(Usuario, path.usuario_id)
    if usuario is None:
        return erro_json("nao_encontrado", "Usuário não encontrado.", 404)

    db.session.query(ConsultorInstituicao).filter_by(
        usuario_id=path.usuario_id, instituicao_id=path.instituicao_id
    ).delete()

    _registrar_log(
        "desvincular_usuario_instituicao",
        "usuario",
        path.usuario_id,
        {"instituicao_id": path.instituicao_id},
    )
    db.session.commit()
    return {"confirmado": True}


# ---------------------------------------------------------------------------
# Resultados (qualquer instituição, sem restrição de vínculo)
# ---------------------------------------------------------------------------


@bp.get(
    "/instituicoes/<int:instituicao_id>/resultados",
    summary="Resultados agregados de qualquer instituição",
    description="Igual a GET /consultor/instituicoes/{id}/resultados, mas sem exigir vínculo — o Administrador vê todas.",
    responses={200: ListaResultadosResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def resultados_de_qualquer_instituicao(path: InstituicaoIdPath):
    return obter_resultados(path.instituicao_id)


@bp.get(
    "/instituicoes/<int:instituicao_id>/resultados/export",
    summary="Exportar resultados de uma instituição (CSV)",
    description=(
        "Mesmo recorte de GET /admin/instituicoes/{id}/resultados (valores "
        "agregados crus por instrumento, incluindo a linha 'geral' — ex.: "
        "quadrante do Karasek), em CSV. `valor_agregado` vai serializado "
        "como JSON numa coluna (o formato varia por instrumento/linha)."
    ),
    responses={200: {"content": {"text/csv": {"schema": {"type": "string"}}}}, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def exportar_resultados_instituicao(path: InstituicaoIdPath, query: ExportResultadosInstituicaoQuery):
    csv_texto, nome_arquivo = exportar_resultados_instituicao_csv(
        path.instituicao_id, query.setor_id, g.usuario.id
    )
    return Response(
        csv_texto,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={nome_arquivo}"},
    )


@bp.get(
    "/resultados",
    summary="Dashboard de resultados (multi-filtro)",
    description=(
        "Resultados agregados por dimensão (domínio), filtráveis por várias "
        "instituições/setores/questionários e por instrumento ('karasek', "
        "'copsoq' ou 'misto') ao mesmo tempo — diferente de "
        "GET /admin/instituicoes/{id}/resultados, que é escopado a uma "
        "instituição só. Cada grupo passa pelo filtro de k-anonimato "
        "individualmente antes de qualquer agregação (docs/05). Inclui "
        "`risco`/`nivel_risco` (0-100, 4 faixas, comparável entre "
        "instrumentos) usado pelo radar/mapa de risco do painel."
    ),
    responses={200: ListaResultadosDimensaoResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def resultados_dashboard(query: FiltroResultadosQuery):
    return obter_resultados_dashboard(
        instituicao_ids=query.instituicao_ids,
        setor_ids=query.setor_ids,
        questionario_ids=query.questionario_ids,
        instrumento=query.instrumento,
    )


@bp.get(
    "/resultados/export",
    summary="Exportar dashboard de resultados (CSV)",
    description="Mesmo recorte/filtros de GET /admin/resultados, em CSV.",
    responses={200: {"content": {"text/csv": {"schema": {"type": "string"}}}}, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def exportar_resultados_dashboard(query: FiltroResultadosQuery):
    csv_texto, nome_arquivo = exportar_resultados_csv(
        query.instituicao_ids, query.setor_ids, query.questionario_ids, query.instrumento, g.usuario.id
    )
    return Response(
        csv_texto,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={nome_arquivo}"},
    )


# ---------------------------------------------------------------------------
# Estatísticas (painel do Administrador)
# ---------------------------------------------------------------------------


@bp.get(
    "/estatisticas",
    summary="Estatísticas gerais para o painel do Administrador",
    description=(
        "Contagens agregadas (instituições, questionários, usuários, "
        "respostas) mais um alerta de k-anonimato e um ranking de volume "
        "de respostas por instituição. `por_instituicao` só mostra "
        "contagem — nunca conteúdo nem resultado calculado — então não "
        "passa pelo filtro de k-anonimato (docs/05); já "
        "`k_anonimato.grupos_abaixo_threshold` é só um número, sem "
        "identificar quais grupos são, para não vazar tamanho de grupo "
        "pequeno associado a uma instituição nomeada."
    ),
    responses={200: EstatisticasResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def obter_estatisticas():
    return _montar_estatisticas_completas()


def _montar_estatisticas_completas() -> dict:
    """Reaproveitada por GET /admin/estatisticas (JSON) e
    GET /admin/estatisticas/export (PDF, services/estatisticas.gerar_relatorio_pdf)
    — mesmo payload nos dois casos."""
    instituicoes_ativo = [i.ativo for i in db.session.query(Instituicao.ativo).all()]
    questionarios_ativo = [q.ativo for q in db.session.query(Questionario.ativo).all()]
    # Banco "auth", separado do banco anônimo consultado acima — junta-se
    # em memória, nunca com um JOIN entre bancos (docs/03).
    usuarios_papel = [u.papel for u in db.session.query(Usuario.papel).all()]
    totais = montar_totais(instituicoes_ativo, questionarios_ativo, usuarios_papel)

    agora = datetime.now(timezone.utc)
    total_respostas = db.session.query(func.count(RespostaBruta.id)).scalar()
    respostas_7d = (
        db.session.query(func.count(RespostaBruta.id))
        .filter(RespostaBruta.respondido_em >= agora - timedelta(days=7))
        .scalar()
    )
    respostas_30d = (
        db.session.query(func.count(RespostaBruta.id))
        .filter(RespostaBruta.respondido_em >= agora - timedelta(days=30))
        .scalar()
    )

    threshold = obter_threshold()
    # Uma linha por grupo (instituição+setor+questionário) distinto — um
    # grupo tem uma linha de ResultadoAgregado por domínio, todas com o
    # mesmo n_respostas (ver services/k_anonimato.py:recalcular_resultados).
    grupos = (
        db.session.query(
            ResultadoAgregado.instituicao_id,
            ResultadoAgregado.setor_id,
            ResultadoAgregado.questionario_id,
            ResultadoAgregado.n_respostas,
        )
        .distinct()
        .all()
    )
    grupos_abaixo_threshold = contar_grupos_abaixo_threshold(
        [g.n_respostas for g in grupos], threshold
    )

    contagens_por_instituicao = (
        db.session.query(
            RespostaBruta.instituicao_id, func.count(RespostaBruta.id).label("total")
        )
        .group_by(RespostaBruta.instituicao_id)
        .order_by(func.count(RespostaBruta.id).desc())
        .limit(10)
        .all()
    )
    nomes_instituicao = {
        i.id: i.nome
        for i in db.session.query(Instituicao.id, Instituicao.nome)
        .filter(Instituicao.id.in_([c.instituicao_id for c in contagens_por_instituicao]))
        .all()
    }

    return {
        **totais,
        "respostas": {
            "total": total_respostas,
            "ultimos_7_dias": respostas_7d,
            "ultimos_30_dias": respostas_30d,
        },
        "k_anonimato": {
            "threshold_atual": threshold,
            "grupos_abaixo_threshold": grupos_abaixo_threshold,
        },
        "por_instituicao": [
            {
                "instituicao_id": c.instituicao_id,
                "nome": nomes_instituicao.get(c.instituicao_id, "?"),
                "total_respostas": c.total,
            }
            for c in contagens_por_instituicao
        ],
    }


@bp.get(
    "/estatisticas/export",
    summary="Exportar Visão geral em PDF",
    description="Mesmo conteúdo de GET /admin/estatisticas, formatado como relatório em PDF (reportlab, paginação automática).",
    responses={200: {"content": {"application/pdf": {"schema": {"type": "string", "format": "binary"}}}}, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def exportar_estatisticas_pdf():
    dados = _montar_estatisticas_completas()
    pdf_bytes = gerar_relatorio_pdf(dados)
    _registrar_log("exportar_estatisticas_pdf", "estatisticas")
    db.session.commit()
    nome_arquivo = nome_arquivo_timestamp("visao_geral", "pdf")
    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={nome_arquivo}"},
    )


# ---------------------------------------------------------------------------
# Exportação CSV de respostas brutas
# ---------------------------------------------------------------------------


@bp.get(
    "/respostas/export",
    summary="Exportar respostas brutas em CSV",
    description=(
        "**Contorna o filtro de k-anonimato** — retorna dados desagregados, "
        "linha por resposta individual. Por isso exige "
        "`confirmo_export_dados_sensiveis=true` explicitamente (400 sem "
        "isso) e toda chamada é registrada em `log_atividade` com quem "
        "exportou, quando e quais filtros foram usados "
        "(docs/05-regras-de-negocio-e-privacidade.md). "
        "Os dados são sensíveis sob a LGPD mesmo sendo nominalmente "
        "anônimos (podem ser reidentificáveis por cruzamento, ex.: setor "
        "pequeno) — o uso e guarda do arquivo exportado é responsabilidade "
        "de quem exporta."
    ),
    responses={200: {"content": {"text/csv": {"schema": {"type": "string"}}}}, **respostas_erro(400, 401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def exportar_respostas(query: ExportRespostasQuery):
    # Além da confirmação por query param (documentada acima, compatível
    # com o método GET), também aceitamos a confirmação em um corpo JSON —
    # não documentado no OpenAPI por não ser o uso recomendado em uma rota
    # GET, mas mantido por robustez para clientes que preferirem enviar
    # a confirmação no payload.
    corpo = request.get_json(silent=True) or {}
    confirmado = query.confirmo_export_dados_sensiveis or corpo.get("confirmo_export_dados_sensiveis") is True
    if not confirmado:
        return erro_json(
            "confirmacao_obrigatoria",
            "É necessário confirmar explicitamente a exportação de dados "
            "sensíveis (confirmo_export_dados_sensiveis: true).",
            400,
        )

    filtros = {
        "instituicao_id": query.instituicao_id,
        "setor_id": query.setor_id,
        "questionario_id": query.questionario_id,
    }
    filtros = {k: v for k, v in filtros.items() if v is not None}

    csv_texto, nome_arquivo = exportar_respostas_csv(filtros, g.usuario.id)
    return Response(
        csv_texto,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={nome_arquivo}"},
    )


# ---------------------------------------------------------------------------
# Configurações (threshold de k-anonimato, toggles de IA, provedor LLM)
# ---------------------------------------------------------------------------


@bp.get(
    "/configuracoes",
    summary="Obter configurações do sistema",
    description="Threshold de k-anonimato + toggles/credenciais de IA (linha única, tabela configuracoes_sistema).",
    responses={200: ConfiguracoesResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def obter_configuracoes():
    config = obter_configuracao()
    return {
        "k_anonimato_threshold": config.k_anonimato_threshold,
        "ia_sugestao_questionario_enabled": config.ia_sugestao_questionario_enabled,
        "ia_analise_resultados_enabled": config.ia_analise_resultados_enabled,
        "ia_chat_enabled": config.ia_chat_enabled,
        "acessibilidade_widget_enabled": config.acessibilidade_widget_enabled,
        "llm_provider": config.llm_provider,
        "llm_base_url": config.llm_base_url,
        "llm_model": config.llm_model,
        "llm_api_key_configurada": bool(config.llm_api_key),
    }


@bp.put(
    "/configuracoes",
    summary="Atualizar configurações do sistema",
    description=(
        "Só altera os campos enviados no payload. Mudanças em "
        "`k_anonimato_threshold` refletem imediatamente em toda leitura de "
        "resultado agregado (o threshold é sempre lido do banco no momento "
        "da consulta — nunca cacheado). O valor de `llm_api_key` nunca é "
        "registrado em `log_atividade` (apenas o fato de ter sido alterado)."
    ),
    responses={200: ConfirmadoResponse, **respostas_erro(400, 401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def atualizar_configuracoes(body: AtualizarConfiguracoesBody):
    config = obter_configuracao()
    dados = body.model_dump(exclude_unset=True)

    if "k_anonimato_threshold" in dados:
        try:
            threshold = int(dados["k_anonimato_threshold"])
        except (TypeError, ValueError):
            threshold = -1
        if threshold < 1:
            return erro_json(
                "threshold_invalido", "k_anonimato_threshold deve ser um inteiro >= 1.", 400
            )
        config.k_anonimato_threshold = threshold

    for campo in (
        "ia_sugestao_questionario_enabled",
        "ia_analise_resultados_enabled",
        "ia_chat_enabled",
        "acessibilidade_widget_enabled",
    ):
        if campo in dados:
            setattr(config, campo, bool(dados[campo]))

    for campo in ("llm_provider", "llm_api_key", "llm_base_url", "llm_model"):
        if campo in dados:
            setattr(config, campo, dados[campo])

    campos_alterados = [c for c in dados if c != "llm_api_key"]
    if "llm_api_key" in dados:
        campos_alterados.append("llm_api_key (valor omitido do log)")
    _registrar_log("atualizar_configuracoes", "configuracoes_sistema", config.id, {"campos": campos_alterados})
    db.session.commit()
    return {"confirmado": True}


@bp.post(
    "/sistema/resetar",
    summary="Resetar sistema (apagar todos os dados)",
    description=(
        "Ação irreversível: apaga todos os dados operacionais dos 3 bancos "
        "(instituições, questionários, respostas, resultados, planos de "
        "ação, memória institucional, conversas de chat, sessões, log de "
        "atividade), preserva todas as contas com papel Administrador e "
        "devolve as configurações do sistema ao padrão de fábrica. Exige "
        f"`frase_confirmacao` igual a '{FRASE_CONFIRMACAO_RESET}' e a senha "
        "atual do Administrador — qualquer uma incorreta, nada é alterado. "
        "Todas as sessões (inclusive a de quem executa) são revogadas: a "
        "próxima chamada autenticada, de qualquer pessoa, recebe 401."
    ),
    responses={200: ConfirmadoResponse, **respostas_erro(400, 401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def resetar_sistema_rota(body: ResetarSistemaBody):
    if body.frase_confirmacao != FRASE_CONFIRMACAO_RESET:
        return erro_json(
            "frase_confirmacao_invalida",
            f"Digite exatamente '{FRASE_CONFIRMACAO_RESET}' para confirmar.",
            400,
        )
    if not verificar_senha(body.senha_atual, g.usuario.senha_hash):
        return erro_json("senha_atual_invalida", "Senha atual incorreta.", 400)

    reset_sistema.resetar_sistema(g.usuario)
    return {"confirmado": True}


# ---------------------------------------------------------------------------
# Log de atividade
# ---------------------------------------------------------------------------


@bp.get(
    "/logs",
    summary="Consultar log de atividade",
    description="Filtrável por usuario_id e/ou acao. Mais recentes primeiro, limitado por `limite` (padrão 200, máx. 1000).",
    responses={200: ListaLogsResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def listar_logs(query: ListarLogsQuery):
    consulta = db.session.query(LogAtividade)
    if query.usuario_id is not None:
        consulta = consulta.filter_by(usuario_id=query.usuario_id)
    if query.acao:
        consulta = consulta.filter_by(acao=query.acao)

    limite = min(query.limite or 200, 1000)
    logs = consulta.order_by(LogAtividade.criado_em.desc()).limit(limite).all()
    return [
        {
            "id": log.id,
            "usuario_id": log.usuario_id,
            "acao": log.acao,
            "entidade": log.entidade,
            "entidade_id": log.entidade_id,
            "detalhes": log.detalhes,
            "criado_em": log.criado_em.isoformat(),
        }
        for log in logs
    ]


# ---------------------------------------------------------------------------
# Memória institucional
# ---------------------------------------------------------------------------


@bp.get(
    "/memoria",
    summary="Listar registros de memória institucional",
    description="Opcionalmente filtrado por instituicao_id. Mais recentes primeiro.",
    responses={200: ListaMemoriaAdminResponse, **respostas_erro(401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def listar_memoria(query: ListarMemoriaQuery):
    consulta = db.session.query(RegistroMemoria)
    if query.instituicao_id is not None:
        consulta = consulta.filter_by(instituicao_id=query.instituicao_id)
    registros = consulta.order_by(RegistroMemoria.criado_em.desc()).all()
    return [
        {
            "id": r.id,
            "instituicao_id": r.instituicao_id,
            "tipo": r.tipo,
            "titulo": r.titulo,
            "descricao": r.descricao,
            "anexo_url": r.anexo_url,
            "criado_em": r.criado_em.isoformat(),
        }
        for r in registros
    ]


@bp.post(
    "/memoria",
    summary="Criar registro de memória institucional",
    description="Documentos, atas de roda de conversa, ações realizadas — vinculados a uma instituição já cadastrada.",
    responses={201: IdCriadoResponse, **respostas_erro(400, 401, 403)},
)
@requer_papel(PAPEL_ADMINISTRADOR)
def criar_memoria(body: MemoriaBody):
    titulo = body.titulo.strip()
    tipo = body.tipo.strip()

    if not body.instituicao_id or not titulo or not tipo:
        return erro_json(
            "payload_invalido", "Informe instituicao_id, tipo e titulo.", 400
        )

    instituicao = db.session.get(Instituicao, body.instituicao_id)
    if instituicao is None:
        return erro_json("instituicao_invalida", "instituicao_id inválido.", 400)

    registro = RegistroMemoria(
        instituicao_id=body.instituicao_id,
        tipo=tipo,
        titulo=titulo,
        descricao=body.descricao,
        anexo_url=body.anexo_url,
        criado_por_usuario_id=g.usuario.id,
    )
    db.session.add(registro)
    db.session.flush()
    _registrar_log("criar_memoria", "registro_memoria", registro.id)
    db.session.commit()
    return {"id": registro.id}, 201
