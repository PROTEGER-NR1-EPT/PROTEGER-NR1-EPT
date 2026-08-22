// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useCallback, useEffect, useState } from "react";

import * as chatApi from "../api/chat";

// Estado e envio de mensagens do chat de ajuda — extraído para ser
// reaproveitado tanto pelo widget flutuante (ChatAjudaWidget.jsx) quanto
// pela página dedicada (pages/assistente-ia/AssistenteIaPage.jsx), que só
// diferem na UI ao redor (painel flutuante vs. página cheia, com seletor
// de instituição/usuário).
//
// - `tela`/`instituicaoId`: contexto mandado ao backend a cada mensagem
//   (nunca persistido — ver services/chat_ia.py).
// - `usuarioId`: só Administrador pode informar um id diferente do
//   próprio, pra auditar a conversa de outro usuário.
// - `somenteLeitura`: desabilita `enviar` — usado quando o Administrador
//   está visualizando o histórico de outra pessoa (não é lugar de mandar
//   mensagem em nome dela).
// - `autoCarregar`: controla se o histórico é buscado agora (a página
//   sempre quer isso; o widget só quer buscar quando o painel abre pela
//   primeira vez — passa a própria flag `aberto`).
export function useChatAjuda({
  tela,
  instituicaoId,
  usuarioId,
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
    chatApi
      .listarMensagens(usuarioId)
      .then((dados) => setMensagens(dados.mensagens))
      .catch((erroApi) => setErro(erroApi.mensagem))
      .finally(() => setCarregandoHistorico(false));
  }, [usuarioId]);

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
      const resposta = await chatApi.enviarMensagem(limpo, { tela, instituicaoId });
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
