// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { api } from "./client";

export async function login(email, senha) {
  const { data } = await api.post("/auth/login", { email, senha });
  return data;
}

export async function logout() {
  const { data } = await api.post("/auth/logout");
  return data;
}

// Restaura a sessão a partir do cookie httpOnly (definido no login) —
// chamada só uma vez, ao carregar a aplicação. Ver AuthContext.jsx.
export async function restaurarSessao() {
  const { data } = await api.get("/auth/sessao");
  return data;
}

export async function alterarSenha(senhaAtual, senhaNova) {
  const { data } = await api.put("/auth/senha", {
    senha_atual: senhaAtual,
    senha_nova: senhaNova,
  });
  return data;
}
