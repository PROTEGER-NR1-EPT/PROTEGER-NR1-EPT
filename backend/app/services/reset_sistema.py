# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

"""Reset total do sistema — apaga todos os dados operacionais dos 3 bancos
(anonimo/auth/memoria), preserva as contas com papel Administrador e
devolve configuracoes_sistema ao padrão de fábrica. Ação irreversível,
chamada só depois de dupla confirmação (frase + senha atual) em
blueprints/admin.py, ou via `flask resetar-sistema --confirmar`.

Ordem de exclusão: tabela filha antes da pai, dentro de cada bind — só
uma FK do sistema inteiro tem `ondelete="CASCADE"` real no Postgres
(mensagens_chat -> conversas_chat); todas as outras são NO ACTION, então
um DELETE bulk na tabela pai falharia se as filhas não forem apagadas
manualmente antes (mesmo padrão já usado em services/planos_acao.py). A
ordem *entre* bancos não importa aqui — são 3 bancos fisicamente
separados, sem FK real entre eles, e o reset esvazia os três por
completo.
"""

from app.extensions import db
from app.models.anonimo import (
    ConfiguracaoSistema,
    Dominio,
    Instituicao,
    Item,
    Questionario,
    RespostaBruta,
    ResultadoAgregado,
    Setor,
)
from app.models.auth import (
    PAPEL_ADMINISTRADOR,
    ConsultorInstituicao,
    ConversaChat,
    LogAtividade,
    MensagemChat,
    SessaoLogin,
    Usuario,
)
from app.models.memoria import (
    AcaoPlano,
    DependenciaAcao,
    InstituicaoReferencia,
    LinhaDoTempo,
    PlanoAcao,
    RegistroMemoria,
    TarefaAcao,
)
from app.services.k_anonimato import _valores_padrao


def resetar_sistema(usuario_executor: Usuario | None) -> dict:
    contagens = {}

    # --- bind memoria: filha antes da pai -----------------------------------
    contagens["dependencias_acao"] = db.session.query(DependenciaAcao).delete(synchronize_session=False)
    contagens["tarefas_acao"] = db.session.query(TarefaAcao).delete(synchronize_session=False)
    contagens["linha_do_tempo"] = db.session.query(LinhaDoTempo).delete(synchronize_session=False)
    contagens["acoes_plano"] = db.session.query(AcaoPlano).delete(synchronize_session=False)
    contagens["planos_acao"] = db.session.query(PlanoAcao).delete(synchronize_session=False)
    contagens["registros_memoria"] = db.session.query(RegistroMemoria).delete(synchronize_session=False)
    contagens["instituicoes_referencia"] = db.session.query(InstituicaoReferencia).delete(
        synchronize_session=False
    )

    # --- bind anonimo: filha antes da pai ------------------------------------
    contagens["resultados_agregados"] = db.session.query(ResultadoAgregado).delete(synchronize_session=False)
    contagens["respostas_brutas"] = db.session.query(RespostaBruta).delete(synchronize_session=False)
    contagens["itens"] = db.session.query(Item).delete(synchronize_session=False)
    contagens["setores"] = db.session.query(Setor).delete(synchronize_session=False)
    contagens["dominios"] = db.session.query(Dominio).delete(synchronize_session=False)
    contagens["instituicoes"] = db.session.query(Instituicao).delete(synchronize_session=False)
    contagens["questionarios"] = db.session.query(Questionario).delete(synchronize_session=False)

    # configuracoes_sistema volta ao padrão de fábrica, in-place (não é
    # apagada e recriada) — reaproveita os mesmos valores/env vars usados
    # na criação preguiçosa em services/k_anonimato.obter_configuracao().
    config = db.session.get(ConfiguracaoSistema, 1)
    if config is None:
        config = ConfiguracaoSistema(id=1, **_valores_padrao())
        db.session.add(config)
    else:
        for campo, valor in _valores_padrao().items():
            setattr(config, campo, valor)

    # --- bind auth: filha antes da pai ---------------------------------------
    contagens["mensagens_chat"] = db.session.query(MensagemChat).delete(synchronize_session=False)
    contagens["conversas_chat"] = db.session.query(ConversaChat).delete(synchronize_session=False)
    contagens["log_atividade"] = db.session.query(LogAtividade).delete(synchronize_session=False)
    # Apaga TODAS as sessões, inclusive a de quem está executando o reset —
    # um reset de verdade não deveria deixar nenhum token de sessão antigo
    # vivo. A resposta HTTP desta chamada ainda chega normal (o token já
    # estava autenticado quando o request começou); a PRÓXIMA chamada
    # autenticada, de qualquer um, cai em 401.
    contagens["sessao_login"] = db.session.query(SessaoLogin).delete(synchronize_session=False)
    contagens["consultor_instituicao"] = db.session.query(ConsultorInstituicao).delete(
        synchronize_session=False
    )
    contagens["usuarios_removidos"] = (
        db.session.query(Usuario).filter(Usuario.papel != PAPEL_ADMINISTRADOR).delete(synchronize_session=False)
    )
    contagens["administradores_preservados"] = (
        db.session.query(Usuario).filter(Usuario.papel == PAPEL_ADMINISTRADOR).count()
    )

    # Log novo, só com o próprio evento do reset — inserido depois do
    # DELETE em log_atividade, na mesma transação.
    db.session.add(
        LogAtividade(
            usuario_id=usuario_executor.id if usuario_executor else None,
            acao="resetar_sistema",
            entidade="sistema",
            detalhes=contagens,
        )
    )

    db.session.commit()
    return contagens
