// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

// Rotas de IA de acesso compartilhado entre Consultor e Administrador
// (fora do prefixo /admin) — mesmo motivo de api/chat.js ser separado de
// admin.js/consultor.js.

import { api } from "./client";

export async function obterStatusAnaliseResultados() {
  const { data } = await api.get("/ia/resultados/status");
  return data;
}

export async function gerarAnaliseResultados(resultados) {
  const { data } = await api.post("/ia/resultados/analise", { resultados });
  return data;
}
