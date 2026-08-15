import { createContext, useCallback, useEffect, useState } from "react";

import * as authApi from "../api/auth";
import { definirTokenSessao, registrarCallbackNaoAutenticado } from "../api/client";

// ---------------------------------------------------------------------------
// Sessão mantida SÓ em estado de aplicação (useState), nunca em
// localStorage/sessionStorage — regra obrigatória do projeto, já que o
// backend usa token de sessão via `Authorization: Bearer` (não cookie
// httpOnly). Consequência deliberada: atualizar a página (F5) encerra a
// sessão. Ver backend/app/auth/security.py para a justificativa da escolha
// de autenticação no backend.
// ---------------------------------------------------------------------------

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [carregando, setCarregando] = useState(false);

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
