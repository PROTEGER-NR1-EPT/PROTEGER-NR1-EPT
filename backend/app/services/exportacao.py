# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

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
#
# formatar_csv()/nome_arquivo_timestamp() são helpers genéricos, reaproveitados
# por todas as exportações do sistema (respostas brutas aqui, e resultados/
# resultados por instituição/planos de ação/questionários em seus próprios
# services) — nenhuma delas repete io.StringIO()/csv.writer na mão.
# ---------------------------------------------------------------------------


def formatar_csv(cabecalho: list[str], linhas: list[list]) -> str:
    buffer = io.StringIO()
    escritor = csv.writer(buffer)
    escritor.writerow(cabecalho)
    escritor.writerows(linhas)
    return buffer.getvalue()


def nome_arquivo_timestamp(prefixo: str, extensao: str) -> str:
    agora = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    return f"{prefixo}_{agora}.{extensao}"


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

    csv_texto = formatar_csv(
        ["id", "questionario_id", "instituicao_id", "setor_id", "respondido_em", "payload_json"],
        [
            [
                resposta.id,
                resposta.questionario_id,
                resposta.instituicao_id,
                resposta.setor_id,
                resposta.respondido_em.isoformat(),
                resposta.payload_json,
            ]
            for resposta in respostas
        ],
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

    return csv_texto, nome_arquivo_timestamp("respostas_brutas", "csv")
