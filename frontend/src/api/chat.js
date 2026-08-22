// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { api } from "./client";

export async function obterStatus() {
  const { data } = await api.get("/chat/status");
  return data;
}

// --- Conversas — cada uma com seu próprio fio de mensagens -------------

export async function criarConversa() {
  const { data } = await api.post("/chat/conversas");
  return data;
}

// usuarioId: só Administrador pode informar um id diferente do próprio,
// pra auditar as conversas de outro usuário — Consultor recebe 403.
export async function listarConversas(usuarioId) {
  const { data } = await api.get("/chat/conversas", {
    params: usuarioId ? { usuario_id: usuarioId } : {},
  });
  return data;
}

export async function listarMensagensConversa(conversaId, usuarioId) {
  const { data } = await api.get(`/chat/conversas/${conversaId}/mensagens`, {
    params: usuarioId ? { usuario_id: usuarioId } : {},
  });
  return data;
}

export async function excluirConversa(conversaId, usuarioId) {
  const { data } = await api.delete(`/chat/conversas/${conversaId}`, {
    params: usuarioId ? { usuario_id: usuarioId } : {},
  });
  return data;
}

export async function exportarConversaCsv(conversaId, usuarioId) {
  const resposta = await api.get(`/chat/conversas/${conversaId}/export`, {
    params: usuarioId ? { usuario_id: usuarioId } : {},
    responseType: "blob",
  });
  return { blob: resposta.data, nomeArquivo: _nomeArquivo(resposta, "conversa.csv") };
}

// --- Ações "todas as conversas de uma vez" (bulk) -----------------------

export async function listarMensagens(usuarioId) {
  const { data } = await api.get("/chat/mensagens", {
    params: usuarioId ? { usuario_id: usuarioId } : {},
  });
  return data;
}

export async function excluirHistorico(usuarioId) {
  const { data } = await api.delete("/chat/mensagens", {
    params: usuarioId ? { usuario_id: usuarioId } : {},
  });
  return data;
}

// Mesmo padrão de adminApi.exportarRespostasCsv (admin.js) — responseType
// "blob" + nome do arquivo extraído do header Content-Disposition.
export async function exportarHistoricoCsv(usuarioId) {
  const resposta = await api.get("/chat/mensagens/export", {
    params: usuarioId ? { usuario_id: usuarioId } : {},
    responseType: "blob",
  });
  return { blob: resposta.data, nomeArquivo: _nomeArquivo(resposta, "historico_chat.csv") };
}

function _nomeArquivo(resposta, padrao) {
  const disposicao = resposta.headers["content-disposition"] || "";
  const nomeCasado = disposicao.match(/filename=([^;]+)/);
  return nomeCasado ? nomeCasado[1].trim() : padrao;
}

export async function enviarMensagem(mensagem, { tela, instituicaoId, conversaId } = {}) {
  const { data } = await api.post("/chat/mensagens", {
    mensagem,
    tela: tela ?? null,
    instituicao_id: instituicaoId ?? null,
    conversa_id: conversaId ?? null,
  });
  return data;
}
