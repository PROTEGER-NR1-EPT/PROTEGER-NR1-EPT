import { createContext, useCallback, useEffect, useState } from "react";

import * as authApi from "../api/auth";
import { definirTokenSessao, registrarCallbackNaoAutenticado } from "../api/client";

// ---------------------------------------------------------------------------
// Sessão mantida em estado de aplicação (useState), nunca em
// localStorage/sessionStorage — regra obrigatória do projeto, já que o
// backend usa token de sessão via `Authorization: Bearer` (não cookie
// httpOnly) para as chamadas normais à API. O token em si só existe em
// memória e some ao dar F5.
//
// O que sobrevive ao F5 é só um cookie httpOnly separado (setado no login,
// nunca lido por este código — o navegador cuida disso sozinho): ao montar,
// tentamos restaurar a sessão chamando GET /auth/sessao, que valida esse
// cookie no servidor e devolve um novo token para repovoar o estado em
// memória. Ver backend/app/blueprints/auth.py e frontend/README.md.
// ---------------------------------------------------------------------------

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const limparSessao = useCallback(() => {
    definirTokenSessao(null);
    setToken(null);
    setUsuario(null);
  }, []);

  useEffect(() => {
    // Reage a um 401 detectado pelo backend em QUALQUER chamada — nunca
    // confiamos apenas no estado local para decidir se a sessão ainda é
    // válida (regra 6 do prompt de implementação do frontend).
    registrarCallbackNaoAutenticado(limparSessao);
  }, [limparSessao]);

  useEffect(() => {
    let cancelado = false;

    authApi
      .restaurarSessao()
      .then((resposta) => {
        if (cancelado) return;
        definirTokenSessao(resposta.token);
        setToken(resposta.token);
        setUsuario(resposta.usuario);
      })
      .catch(() => {
        // Sem cookie válido (nunca logou, sessão expirada/revogada, ou
        // navegador bloqueando cookie de terceiro) — segue deslogado, sem
        // erro visível: este é o caminho normal na maioria dos acessos.
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const entrar = useCallback(async (email, senha) => {
    setCarregando(true);
    try {
      const resposta = await authApi.login(email, senha);
      definirTokenSessao(resposta.token);
      setToken(resposta.token);
      setUsuario(resposta.usuario);
      return resposta.usuario;
    } finally {
      setCarregando(false);
    }
  }, []);

  const sair = useCallback(async () => {
    try {
      if (token) {
        await authApi.logout();
      }
    } finally {
      limparSessao();
    }
  }, [token, limparSessao]);

  const valor = {
    usuario,
    papel: usuario?.papel ?? null,
    estaAutenticado: Boolean(usuario && token),
    carregando,
    entrar,
    sair,
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
