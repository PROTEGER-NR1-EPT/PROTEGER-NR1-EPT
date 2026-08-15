import csv
import io
from datetime import datetime, timezone

from app.extensions import db
from app.models.anonimo import RespostaBruta
from app.models.auth import LogAtividade

# ---------------------------------------------------------------------------
# Exportação de respostas brutas: contorna o filtro de k-anonimato (é dado
# desagregado) — por isso a rota que chama este serviço exige confirmação
# explícita no payload e toda chamada é registrada em log_atividade (docs/05).
# ---------------------------------------------------------------------------


def exportar_respostas_csv(filtros: dict, usuario_id: int) -> tuple[str, str]:
    consulta = db.session.query(RespostaBruta)

    instituicao_id = filtros.get("instituicao_id")
    setor_id = filtros.get("setor_id")
    questionario_id = filtros.get("questionario_id")

    if instituicao_id is not None:
        consulta = consulta.filter(RespostaBruta.instituicao_id == instituicao_id)
    if setor_id is not None:
        consulta = consulta.filter(RespostaBruta.setor_id == setor_id)
    if questionario_id is not None:
        consulta = consulta.filter(RespostaBruta.questionario_id == questionario_id)

    respostas = consulta.order_by(RespostaBruta.respondido_em.asc()).all()

    buffer = io.StringIO()
    escritor = csv.writer(buffer)
    escritor.writerow(
        [
            "id",
            "questionario_id",
            "instituicao_id",
            "setor_id",
            "respondido_em",
            "payload_json",
        ]
    )
    for resposta in respostas:
        escritor.writerow(
            [
                resposta.id,
                resposta.questionario_id,
                resposta.instituicao_id,
                resposta.setor_id,
                resposta.respondido_em.isoformat(),
                resposta.payload_json,
            ]
        )

    log = LogAtividade(
        usuario_id=usuario_id,
        acao="exportar_respostas_csv",
        entidade="respostas_brutas",
        entidade_id=None,
        detalhes={"filtros": filtros, "total_linhas": len(respostas)},
    )
    db.session.add(log)
    db.session.commit()

    agora = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    nome_arquivo = f"respostas_brutas_{agora}.csv"
    return buffer.getvalue(), nome_arquivo
