// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useCallback, useEffect, useState } from "react";

import * as chatApi from "../api/chat";

// Estado e envio de mensagens do chat de ajuda — extraído para ser
// reaproveitado tanto pelo widget flutuante (ChatAjudaWidget.jsx) quanto
// pela página dedicada (pages/assistente-ia/AssistenteIaPage.jsx), que só
// diferem na UI ao redor (painel flutuante vs. página cheia, com seletor
// de instituição/usuário/conversa).
//
// - `tela`/`instituicaoId`: contexto mandado ao backend a cada mensagem
//   (nunca persistido — ver services/chat_ia.py).
// - `conversaId`: quando informado, opera sobre essa conversa específica
//   (GET/DELETE /chat/conversas/{id}/...) — é o caminho da página, que
//   gerencia múltiplas conversas. Quando omitido (widget flutuante, que
//   não tem UI de conversas), usa o caminho "legado" /chat/mensagens
//   (todas as mensagens do usuário) — e o backend, ao enviar sem
//   `conversa_id`, continua/cria a conversa mais recente automaticamente.
// - `usuarioId`: só Administrador pode informar um id diferente do
//   próprio, pra auditar a conversa de outro usuário.
// - `somenteLeitura`: desabilita `enviar` — usado quando o Administrador
//   está visualizando a conversa de outra pessoa (não é lugar de mandar
//   mensagem em nome dela).
// - `autoCarregar`: controla se o histórico é buscado agora. O widget
//   passa a própria flag `aberto` (só busca quando o painel abre). A
//   página passa `conversaId != null` — só busca depois que uma conversa
//   foi selecionada, pra não misturar o histórico legado "todas as
//   mensagens" com uma conversa específica antes da seleção existir.
export function useChatAjuda({
  tela,
  instituicaoId,
  usuarioId,
  conversaId,
  somenteLeitura = false,
  autoCarregar = true,
} = {}) {
  const [mensagens, setMensagens] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(() => {
    setCarregandoHistorico(true);
    setErro(null);
    const promessa = conversaId
      ? chatApi.listarMensagensConversa(conversaId, usuarioId)
      : chatApi.listarMensagens(usuarioId);
    promessa
      .then((dados) => setMensagens(dados.mensagens))
      .catch((erroApi) => setErro(erroApi.mensagem))
      .finally(() => setCarregandoHistorico(false));
  }, [conversaId, usuarioId]);

  useEffect(() => {
    if (autoCarregar) carregar();
  }, [autoCarregar, carregar]);

  async function enviar(texto) {
    if (somenteLeitura) return;
    const limpo = texto.trim();
    if (!limpo || enviando) return;

    setErro(null);
    setEnviando(true);
    setMensagens((atual) => [
      ...atual,
      { papel: "usuario", conteudo: limpo, criado_em: new Date().toISOString() },
    ]);

    try {
      const resposta = await chatApi.enviarMensagem(limpo, { tela, instituicaoId, conversaId });
      setMensagens((atual) => [...atual, resposta]);
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    } finally {
      setEnviando(false);
    }
  }

  return {
    mensagens,
    setMensagens,
    carregandoHistorico,
    enviando,
    erro,
    setErro,
    enviar,
    recarregar: carregar,
  };
}
