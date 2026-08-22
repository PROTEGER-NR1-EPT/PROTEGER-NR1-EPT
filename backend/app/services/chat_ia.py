# Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
# Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

"""Chat de ajuda contextual — usa o provedor LLM configurado pelo
Administrador (tabela configuracoes_sistema, sempre lida do banco em tempo
de requisição, nunca cacheada — mesmo padrão de services/k_anonimato.py).

Uma pessoa pode ter várias conversas distintas (ConversaChat), cada uma
com seu próprio fio de mensagens (MensagemChat.conversa_id) — o contexto
mandado ao provedor LLM é sempre escopado à conversa, nunca ao usuário
inteiro, para não vazar conteúdo de uma thread pra outra.
"""

import csv
import io
import re
from datetime import datetime, timezone

import openai

from app.extensions import db
from app.models.anonimo import Instituicao
from app.models.auth import (
    PAPEL_ADMINISTRADOR,
    PAPEL_CONSULTOR,
    ConsultorInstituicao,
    ConversaChat,
    LogAtividade,
    MensagemChat,
)
from app.services import llm_client
from app.services.k_anonimato import obter_configuracao, obter_resultados

LIMITE_HISTORICO_EXIBIDO = 200
LIMITE_HISTORICO_CONTEXTO = 20  # últimas N mensagens enviadas ao modelo, como contexto
LIMITE_TITULO = 50

SYSTEM_PROMPT = (
    "Você é o assistente de ajuda do PROTEGER-NR1 EPT, uma plataforma de "
    "avaliação de riscos psicossociais institucionais conforme a NR-1. "
    "Ajude Consultores e Administradores a entender e navegar o sistema: "
    "questionários (Karasek/COPSOQ), dashboards de resultados, o mecanismo "
    "de k-anonimato que protege respostas individuais, planos de ação e as "
    "telas de configuração/administração. Responda sempre em português do "
    "Brasil, de forma objetiva e cordial. Nunca dê diagnóstico clínico, "
    "aconselhamento jurídico ou opinião sobre casos individuais — nesses "
    "casos, oriente o usuário a buscar um profissional qualificado."
)


class ChatIndisponivelError(Exception):
    def __init__(self, codigo: str, mensagem: str, status: int):
        self.codigo = codigo
        self.mensagem = mensagem
        self.status = status
        super().__init__(mensagem)


def chat_disponivel() -> bool:
    config = obter_configuracao()
    return bool(
        config.ia_chat_enabled and config.llm_provider and config.llm_api_key and config.llm_model
    )


def _instituicoes_vinculadas(usuario_id: int) -> set[int]:
    # Mesma consulta de app/blueprints/consultor.py:_instituicoes_vinculadas
    # — duplicada aqui de propósito: um service não deve importar de um
    # blueprint, e são só 4 linhas.
    vinculos = db.session.query(ConsultorInstituicao).filter_by(usuario_id=usuario_id).all()
    return {v.instituicao_id for v in vinculos}


def _resumo_resultados_instituicao(instituicao_id: int) -> str:
    instituicao = db.session.get(Instituicao, instituicao_id)
    nome = instituicao.nome if instituicao else f"#{instituicao_id}"
    resultados = obter_resultados(instituicao_id)

    if not resultados:
        return f'Resultados da instituição "{nome}": nenhum resultado agregado disponível ainda.'

    linhas = [
        f'Resultados agregados da instituição "{nome}" (já filtrados por '
        'k-anonimato — "dados insuficientes" quando o grupo é pequeno '
        "demais para proteger o anonimato das respostas):"
    ]
    for r in resultados:
        dominio = r.get("dominio_nome") or "geral"
        setor = r.get("setor_nome") or "todos os setores"
        if r.get("resultado_disponivel"):
            linhas.append(f"- {dominio} / {setor}: valor agregado {r.get('valor_agregado')} (n={r.get('n_respostas')})")
        else:
            linhas.append(f"- {dominio} / {setor}: dados insuficientes (n={r.get('n_respostas')})")
    return "\n".join(linhas)


def _resolver_usuario_alvo(usuario_atual, usuario_id_alvo: int | None) -> int:
    if usuario_id_alvo is None or usuario_id_alvo == usuario_atual.id:
        return usuario_atual.id
    if usuario_atual.papel != PAPEL_ADMINISTRADOR:
        raise ChatIndisponivelError(
            "acesso_negado", "Você só pode acessar o próprio histórico de conversas.", 403
        )
    return usuario_id_alvo


def _gerar_titulo(texto: str, limite: int = LIMITE_TITULO) -> str:
    texto = re.sub(r"\s+", " ", texto).strip()
    if len(texto) <= limite:
        return texto
    return texto[:limite].rstrip() + "…"


def _resolver_conversa_pertencente(usuario_id: int, conversa_id: int) -> ConversaChat:
    conversa = ConversaChat.query.filter_by(id=conversa_id, usuario_id=usuario_id).first()
    if conversa is None:
        # 404, não 403 — não confirma nem nega a existência de uma
        # conversa que pertence a outro usuário.
        raise ChatIndisponivelError("conversa_nao_encontrada", "Conversa não encontrada.", 404)
    return conversa


def criar_conversa(usuario) -> dict:
    # Sempre para o próprio usuário autenticado — não existe "criar
    # conversa em nome de outro usuário", nem para Administrador.
    conversa = ConversaChat(usuario_id=usuario.id)
    db.session.add(conversa)
    db.session.commit()
    return _serializar_conversa(conversa)


def obter_ou_criar_conversa_ativa(usuario_id: int) -> ConversaChat:
    conversa = (
        ConversaChat.query.filter_by(usuario_id=usuario_id)
        .order_by(ConversaChat.atualizado_em.desc())
        .first()
    )
    if conversa is not None:
        return conversa
    conversa = ConversaChat(usuario_id=usuario_id)
    db.session.add(conversa)
    db.session.flush()  # garante conversa.id sem fechar a transação — o
    # commit acontece junto com a 1ª mensagem, em enviar_mensagem.
    return conversa


def listar_conversas(usuario_atual, usuario_id_alvo: int | None = None) -> list[dict]:
    usuario_id = _resolver_usuario_alvo(usuario_atual, usuario_id_alvo)
    # INNER JOIN esconde conversas ainda sem nenhuma mensagem (criadas via
    # POST /chat/conversas mas abandonadas) — mesmo comportamento visível
    # de "novo chat" do ChatGPT.
    resultados = (
        db.session.query(ConversaChat, db.func.count(MensagemChat.id))
        .join(MensagemChat, MensagemChat.conversa_id == ConversaChat.id)
        .filter(ConversaChat.usuario_id == usuario_id)
        .group_by(ConversaChat.id)
        .order_by(ConversaChat.atualizado_em.desc())
        .all()
    )
    return [_serializar_conversa(c, total) for c, total in resultados]


def listar_mensagens_conversa(
    usuario_atual, conversa_id: int, usuario_id_alvo: int | None = None
) -> list[dict]:
    usuario_id = _resolver_usuario_alvo(usuario_atual, usuario_id_alvo)
    conversa = _resolver_conversa_pertencente(usuario_id, conversa_id)
    mensagens = (
        MensagemChat.query.filter_by(conversa_id=conversa.id)
        .order_by(MensagemChat.criado_em.asc())
        .limit(LIMITE_HISTORICO_EXIBIDO)
        .all()
    )
    return [_serializar(m) for m in mensagens]


def excluir_conversa(usuario_atual, conversa_id: int, usuario_id_alvo: int | None = None) -> int:
    usuario_id = _resolver_usuario_alvo(usuario_atual, usuario_id_alvo)
    conversa = _resolver_conversa_pertencente(usuario_id, conversa_id)
    quantidade = MensagemChat.query.filter_by(conversa_id=conversa.id).count()

    log = LogAtividade(
        usuario_id=usuario_atual.id,
        acao="excluir_conversa_chat",
        entidade="conversas_chat",
        entidade_id=conversa.id,
        detalhes={"usuario_alvo_id": usuario_id, "quantidade_mensagens": quantidade},
    )
    db.session.add(log)
    db.session.delete(conversa)  # ON DELETE CASCADE apaga as mensagens
    db.session.commit()
    return quantidade


def exportar_conversa_csv(
    usuario_atual, conversa_id: int, usuario_id_alvo: int | None = None
) -> tuple[str, str]:
    usuario_id = _resolver_usuario_alvo(usuario_atual, usuario_id_alvo)
    conversa = _resolver_conversa_pertencente(usuario_id, conversa_id)
    mensagens = (
        MensagemChat.query.filter_by(conversa_id=conversa.id)
        .order_by(MensagemChat.criado_em.asc())
        .all()
    )

    buffer = io.StringIO()
    escritor = csv.writer(buffer)
    escritor.writerow(["id", "papel", "conteudo", "criado_em"])
    for m in mensagens:
        escritor.writerow([m.id, m.papel, m.conteudo, m.criado_em.isoformat()])

    log = LogAtividade(
        usuario_id=usuario_atual.id,
        acao="exportar_conversa_chat",
        entidade="conversas_chat",
        entidade_id=conversa.id,
        detalhes={"usuario_alvo_id": usuario_id, "total_linhas": len(mensagens)},
    )
    db.session.add(log)
    db.session.commit()

    agora = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    # Nome do arquivo usa só o id numérico — nunca interpolar
    # conversa.titulo (texto livre do usuário) no Content-Disposition.
    nome_arquivo = f"conversa-{conversa.id}-{agora}.csv"
    return buffer.getvalue(), nome_arquivo


def listar_historico(usuario_atual, usuario_id_alvo: int | None = None) -> list[dict]:
    usuario_id = _resolver_usuario_alvo(usuario_atual, usuario_id_alvo)
    mensagens = (
        MensagemChat.query.filter_by(usuario_id=usuario_id)
        .order_by(MensagemChat.criado_em.asc())
        .limit(LIMITE_HISTORICO_EXIBIDO)
        .all()
    )
    return [_serializar(m) for m in mensagens]


def excluir_historico(usuario_atual, usuario_id_alvo: int | None = None) -> int:
    usuario_id = _resolver_usuario_alvo(usuario_atual, usuario_id_alvo)
    quantidade = MensagemChat.query.filter_by(usuario_id=usuario_id).count()
    # Apaga via ConversaChat (não MensagemChat direto): o ON DELETE CASCADE
    # da FK cuida das mensagens de cada conversa apagada.
    ConversaChat.query.filter_by(usuario_id=usuario_id).delete()

    log = LogAtividade(
        usuario_id=usuario_atual.id,
        acao="excluir_historico_chat",
        entidade="mensagens_chat",
        detalhes={"usuario_alvo_id": usuario_id, "quantidade": quantidade},
    )
    db.session.add(log)
    db.session.commit()
    return quantidade


def exportar_historico_csv(usuario_atual, usuario_id_alvo: int | None = None) -> tuple[str, str]:
    usuario_id = _resolver_usuario_alvo(usuario_atual, usuario_id_alvo)
    mensagens = (
        MensagemChat.query.filter_by(usuario_id=usuario_id)
        .order_by(MensagemChat.criado_em.asc())
        .all()
    )

    buffer = io.StringIO()
    escritor = csv.writer(buffer)
    escritor.writerow(["id", "conversa_id", "papel", "conteudo", "criado_em"])
    for m in mensagens:
        escritor.writerow([m.id, m.conversa_id, m.papel, m.conteudo, m.criado_em.isoformat()])

    log = LogAtividade(
        usuario_id=usuario_atual.id,
        acao="exportar_historico_chat",
        entidade="mensagens_chat",
        detalhes={"usuario_alvo_id": usuario_id, "total_linhas": len(mensagens)},
    )
    db.session.add(log)
    db.session.commit()

    agora = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    nome_arquivo = f"historico_chat_{agora}.csv"
    return buffer.getvalue(), nome_arquivo


def enviar_mensagem(
    usuario,
    texto: str,
    tela: str | None = None,
    instituicao_id: int | None = None,
    conversa_id: int | None = None,
) -> dict:
    config = obter_configuracao()

    if not config.ia_chat_enabled:
        raise ChatIndisponivelError(
            "chat_desativado",
            "O chat de ajuda não está ativado. Peça a um Administrador para "
            "habilitá-lo em Configurações.",
            403,
        )

    if not config.llm_provider or not config.llm_api_key or not config.llm_model:
        raise ChatIndisponivelError(
            "provedor_llm_nao_configurado",
            "O provedor de IA ainda não foi configurado por um Administrador.",
            400,
        )

    resumo_instituicao = None
    if instituicao_id is not None:
        if usuario.papel == PAPEL_CONSULTOR and instituicao_id not in _instituicoes_vinculadas(usuario.id):
            raise ChatIndisponivelError(
                "instituicao_nao_vinculada", "Você não está vinculado a esta instituição.", 403
            )
        resumo_instituicao = _resumo_resultados_instituicao(instituicao_id)

    # Mensagem sempre entra na conversa do próprio remetente — nunca em
    # nome de outro usuário, nem por Administrador. Sem conversa_id
    # explícito, continua/cria a mais recente (é o caminho do widget
    # flutuante, que não tem UI de conversas).
    if conversa_id is not None:
        conversa = _resolver_conversa_pertencente(usuario.id, conversa_id)
    else:
        conversa = obter_ou_criar_conversa_ativa(usuario.id)

    mensagem_usuario = MensagemChat(
        usuario_id=usuario.id, conversa_id=conversa.id, papel="usuario", conteudo=texto
    )
    db.session.add(mensagem_usuario)
    if conversa.titulo is None:
        conversa.titulo = _gerar_titulo(texto)
    conversa.atualizado_em = datetime.now(timezone.utc)
    db.session.add(conversa)
    db.session.commit()

    historico_recente = (
        MensagemChat.query.filter_by(conversa_id=conversa.id)
        .order_by(MensagemChat.criado_em.desc())
        .limit(LIMITE_HISTORICO_CONTEXTO)
        .all()
    )
    # Tela atual e resumo de resultados nunca são persistidos — só informam
    # a IA sobre o contexto deste turno, junto com o system prompt fixo.
    # Provedores compatíveis com OpenAI podem concatenar múltiplas mensagens
    # "system" no início da conversa (ex: Anthropic), então é mais
    # confiável mandar tudo numa única mensagem de sistema do que depender
    # da posição de uma segunda.
    prompt_sistema = SYSTEM_PROMPT
    if tela:
        prompt_sistema += (
            f'\n\nContexto atual: o usuário está agora na tela "{tela}" do '
            "sistema — leve isso em conta ao responder, se for relevante "
            "(ex: se a pergunta for sobre o que está vendo na tela)."
        )
    if resumo_instituicao:
        prompt_sistema += (
            f"\n\n{resumo_instituicao}\n\nBaseie sua resposta estritamente "
            "nesses dados quando a pergunta for sobre os resultados dessa "
            "instituição — nunca invente ou estime números que não foram "
            "fornecidos acima."
        )

    mensagens_historico = [
        {"role": "user" if m.papel == "usuario" else "assistant", "content": m.conteudo}
        for m in reversed(historico_recente)
    ]

    try:
        texto_resposta = llm_client.chamar_llm(
            config, prompt_sistema, mensagens_historico, max_tokens=1024, timeout=30.0
        )
    except openai.APIError:
        raise ChatIndisponivelError(
            "erro_provedor_llm",
            "Não foi possível obter resposta do provedor de IA configurado. "
            "Tente novamente em instantes.",
            502,
        )
    except Exception:
        raise ChatIndisponivelError(
            "erro_provedor_llm",
            "Não foi possível obter resposta do provedor de IA configurado. "
            "Tente novamente em instantes.",
            502,
        )

    mensagem_assistente = MensagemChat(
        usuario_id=usuario.id, conversa_id=conversa.id, papel="assistente", conteudo=texto_resposta
    )
    db.session.add(mensagem_assistente)
    conversa.atualizado_em = datetime.now(timezone.utc)
    db.session.add(conversa)
    db.session.commit()

    return _serializar(mensagem_assistente)


def _serializar(mensagem: MensagemChat) -> dict:
    return {
        "papel": mensagem.papel,
        "conteudo": mensagem.conteudo,
        "criado_em": mensagem.criado_em.isoformat(),
        "conversa_id": mensagem.conversa_id,
    }


def _serializar_conversa(conversa: ConversaChat, quantidade_mensagens: int = 0) -> dict:
    return {
        "id": conversa.id,
        "titulo": conversa.titulo,
        "criado_em": conversa.criado_em.isoformat(),
        "atualizado_em": conversa.atualizado_em.isoformat(),
        "quantidade_mensagens": quantidade_mensagens,
    }
