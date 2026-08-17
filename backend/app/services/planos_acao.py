from app.extensions import db
from app.models.memoria import AcaoPlano, DependenciaAcao, PlanoAcao, TarefaAcao
from app.services.resultados_dashboard import obter_resultados_dashboard

# ---------------------------------------------------------------------------
# CRUD e regras de negócio de Planos de Ação (banco memória — docs/03).
# Validação de payload/existência fica no blueprint (mesmo padrão de
# admin.py); aqui assume-se entrada já validada.
# ---------------------------------------------------------------------------


def listar_planos(instituicao_id: int) -> list[dict]:
    planos = (
        db.session.query(PlanoAcao)
        .filter_by(instituicao_id=instituicao_id)
        .order_by(PlanoAcao.criado_em.desc())
        .all()
    )
    return [
        {
            "id": plano.id,
            "instituicao_id": plano.instituicao_id,
            "ciclo": plano.ciclo,
            "criado_em": plano.criado_em.isoformat(),
            "total_acoes": len(plano.acoes),
            "concluidas": sum(1 for acao in plano.acoes if acao.status == "concluido"),
        }
        for plano in planos
    ]


def criar_plano(instituicao_id: int, ciclo: str, criado_por_usuario_id: int) -> PlanoAcao:
    plano = PlanoAcao(
        instituicao_id=instituicao_id,
        ciclo=ciclo,
        criado_por_usuario_id=criado_por_usuario_id,
    )
    db.session.add(plano)
    db.session.commit()
    return plano


def _serializar_acao(acao: AcaoPlano) -> dict:
    depende_de = (
        db.session.query(AcaoPlano)
        .join(DependenciaAcao, DependenciaAcao.depende_de_acao_id == AcaoPlano.id)
        .filter(DependenciaAcao.acao_id == acao.id)
        .all()
    )
    bloqueia = (
        db.session.query(AcaoPlano)
        .join(DependenciaAcao, DependenciaAcao.acao_id == AcaoPlano.id)
        .filter(DependenciaAcao.depende_de_acao_id == acao.id)
        .all()
    )

    return {
        "id": acao.id,
        "plano_id": acao.plano_id,
        "titulo": acao.titulo,
        "tag": acao.tag,
        "status": acao.status,
        "prazo": acao.prazo.isoformat() if acao.prazo else None,
        "responsavel": acao.responsavel,
        "participantes": acao.participantes or [],
        "anexos": acao.anexos or [],
        "descricao": acao.descricao,
        "ordem": acao.ordem,
        "criado_em": acao.criado_em.isoformat(),
        "atualizado_em": acao.atualizado_em.isoformat(),
        "tarefas": [
            {"id": t.id, "titulo": t.titulo, "concluida": t.concluida, "ordem": t.ordem}
            for t in acao.tarefas
        ],
        "depende_de": [{"id": a.id, "titulo": a.titulo} for a in depende_de],
        "bloqueia": [{"id": a.id, "titulo": a.titulo} for a in bloqueia],
    }


def listar_acoes(plano_id: int) -> list[dict]:
    acoes = (
        db.session.query(AcaoPlano).filter_by(plano_id=plano_id).order_by(AcaoPlano.ordem).all()
    )
    return [_serializar_acao(acao) for acao in acoes]


def _proxima_ordem(plano_id: int, status: str) -> int:
    maior = (
        db.session.query(db.func.max(AcaoPlano.ordem))
        .filter_by(plano_id=plano_id, status=status)
        .scalar()
    )
    return (maior if maior is not None else -1) + 1


def _substituir_tarefas(acao_id: int, tarefas_dados: list[dict]):
    db.session.query(TarefaAcao).filter_by(acao_id=acao_id).delete()
    for ordem, tarefa_dados in enumerate(tarefas_dados or []):
        db.session.add(
            TarefaAcao(
                acao_id=acao_id,
                titulo=tarefa_dados.get("titulo", "").strip(),
                concluida=bool(tarefa_dados.get("concluida", False)),
                ordem=ordem,
            )
        )


def _substituir_dependencias(acao_id: int, depende_de_ids: list[int]):
    db.session.query(DependenciaAcao).filter_by(acao_id=acao_id).delete()
    for depende_de_id in depende_de_ids or []:
        db.session.add(DependenciaAcao(acao_id=acao_id, depende_de_acao_id=depende_de_id))


def criar_acao(plano_id: int, dados: dict) -> AcaoPlano:
    status = dados.get("status") or "pendente"
    acao = AcaoPlano(
        plano_id=plano_id,
        titulo=dados["titulo"].strip(),
        tag=(dados.get("tag") or "").strip() or None,
        status=status,
        prazo=dados.get("prazo"),
        responsavel=dados.get("responsavel"),
        participantes=dados.get("participantes"),
        anexos=dados.get("anexos"),
        descricao=dados.get("descricao"),
        ordem=_proxima_ordem(plano_id, status),
    )
    db.session.add(acao)
    db.session.flush()

    if "tarefas" in dados:
        _substituir_tarefas(acao.id, dados["tarefas"])
    if "depende_de_ids" in dados:
        _substituir_dependencias(acao.id, dados["depende_de_ids"])

    db.session.commit()
    return acao


def editar_acao(acao: AcaoPlano, dados: dict) -> None:
    for campo in (
        "titulo",
        "tag",
        "status",
        "prazo",
        "responsavel",
        "participantes",
        "anexos",
        "descricao",
        "ordem",
    ):
        if campo in dados:
            setattr(acao, campo, dados[campo])

    if "tarefas" in dados:
        _substituir_tarefas(acao.id, dados["tarefas"])
    if "depende_de_ids" in dados:
        _substituir_dependencias(acao.id, dados["depende_de_ids"])

    db.session.commit()


def excluir_acao(acao: AcaoPlano) -> None:
    db.session.query(TarefaAcao).filter_by(acao_id=acao.id).delete()
    db.session.query(DependenciaAcao).filter(
        (DependenciaAcao.acao_id == acao.id) | (DependenciaAcao.depende_de_acao_id == acao.id)
    ).delete(synchronize_session=False)
    db.session.delete(acao)
    db.session.commit()


def editar_tarefa(tarefa: TarefaAcao, concluida: bool) -> None:
    tarefa.concluida = concluida
    db.session.commit()


NIVEIS_RISCO_SUGESTAO = ("alto", "critico")


def gerar_sugestoes(plano: PlanoAcao) -> list[dict]:
    """Cria uma ação-rascunho (status=pendente) por dimensão com
    nivel_risco alto/crítico da instituição do plano, reaproveitando o
    dashboard de Resultados (obter_resultados_dashboard) — sem chamada a
    LLM. Não duplica: pula dimensões que já têm uma ação com a mesma
    `tag` neste plano."""
    resultados = obter_resultados_dashboard(instituicao_ids=[plano.instituicao_id])

    dimensoes_em_risco = {
        r["dominio_nome"] for r in resultados if r.get("nivel_risco") in NIVEIS_RISCO_SUGESTAO
    }

    tags_existentes = {acao.tag for acao in plano.acoes if acao.tag}
    novas_dimensoes = sorted(dimensoes_em_risco - tags_existentes)

    criadas = []
    for dimensao in novas_dimensoes:
        acao = AcaoPlano(
            plano_id=plano.id,
            titulo=f"Ação para {dimensao}",
            tag=dimensao,
            status="pendente",
            descricao=(
                f"Sugestão automática — a dimensão \"{dimensao}\" está em nível de risco "
                "alto ou crítico no diagnóstico mais recente. Revise e ajuste antes de usar."
            ),
            ordem=_proxima_ordem(plano.id, "pendente"),
        )
        db.session.add(acao)
        criadas.append(acao)

    if criadas:
        db.session.commit()
    return [_serializar_acao(acao) for acao in criadas]
