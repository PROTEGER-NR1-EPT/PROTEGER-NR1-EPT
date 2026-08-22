// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useState } from "react";

import * as chatApi from "../api/chat";

// Usado tanto pelo widget flutuante (Header.jsx) quanto pelo item de menu
// "Assistente IA" (AdminLayout.jsx/ConsultorLayout.jsx) para decidir se
// aparecem — só quando o Administrador tiver o chat ativado *e* o
// provedor LLM totalmente configurado (GET /chat/status). Cada
// componente chama este hook independentemente (sem Context novo) — a
// chamada é barata e o projeto já prefere estado local simples.
// `false` por padrão: some por padrão até a API confirmar que está
// disponível, em vez de aparecer e sumir em seguida.
//
// `ativo`: GET /chat/status exige login (Consultor/Administrador) — o
// Header.jsx é montado em toda rota, inclusive públicas, então passa
// `ativo={estaAutenticado && ...}` pra não disparar a chamada (e um 401
// no console) em quem não está logado.
export function useChatDisponivel(ativo = true) {
  const [disponivel, setDisponivel] = useState(false);

  useEffect(() => {
    if (!ativo) {
      setDisponivel(false);
      return;
    }
    let cancelado = false;
    chatApi
      .obterStatus()
      .then((dados) => {
        if (!cancelado) setDisponivel(dados.disponivel);
      })
      .catch(() => {
        // Sem permissão/rede indisponível: mantém escondido (false), sem
        // quebrar a navegação por causa de um recurso opcional.
      });
    return () => {
      cancelado = true;
    };
  }, [ativo]);

  return disponivel;
}
