// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { api } from "./client";

export async function obterStatus() {
  const { data } = await api.get("/chat/status");
  return data;
}

// usuarioId: só Administrador pode informar um id diferente do próprio,
// pra auditar a conversa de outro usuário — Consultor recebe 403.
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

  const disposicao = resposta.headers["content-disposition"] || "";
  const nomeCasado = disposicao.match(/filename=([^;]+)/);
  const nomeArquivo = nomeCasado ? nomeCasado[1].trim() : "historico_chat.csv";

  return { blob: resposta.data, nomeArquivo };
}

export async function enviarMensagem(mensagem, { tela, instituicaoId } = {}) {
  const { data } = await api.post("/chat/mensagens", {
    mensagem,
    tela: tela ?? null,
    instituicao_id: instituicaoId ?? null,
  });
  return data;
}
