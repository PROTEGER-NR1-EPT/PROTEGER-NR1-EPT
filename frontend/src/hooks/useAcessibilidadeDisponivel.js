// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useState } from "react";

import * as publicoApi from "../api/publico";

// Usado por Header.jsx para decidir se mostra o widget flutuante de
// acessibilidade — mesma ideia de useChatDisponivel.js, mas consumindo
// GET /configuracoes-publicas (sem autenticação, já que o widget também
// aparece para visitantes não logados). `true` por padrão (ao contrário do
// chat): o widget é opt-out, não opt-in, então fica visível enquanto a API
// não responde, em vez de aparecer e sumir em seguida.
export function useAcessibilidadeDisponivel() {
  const [disponivel, setDisponivel] = useState(true);

  useEffect(() => {
    let cancelado = false;
    publicoApi
      .obterConfiguracoesPublicas()
      .then((dados) => {
        if (!cancelado) setDisponivel(dados.acessibilidade_widget_enabled);
      })
      .catch(() => {
        // Rede indisponível: mantém visível (true), sem quebrar a
        // navegação por causa de um recurso opcional.
      });
    return () => {
      cancelado = true;
    };
  }, []);

  return disponivel;
}
