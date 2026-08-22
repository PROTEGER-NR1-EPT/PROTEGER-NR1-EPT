// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { api } from "./client";

// --- Instituições ---------------------------------------------------------

export async function listarInstituicoes() {
  const { data } = await api.get("/admin/instituicoes");
  return data;
}

export async function criarInstituicao(instituicao) {
  const { data } = await api.post("/admin/instituicoes", instituicao);
  return data;
}

export async function editarInstituicao(id, alteracoes) {
  const { data } = await api.put(`/admin/instituicoes/${id}`, alteracoes);
  return data;
}

export async function desativarInstituicao(id) {
  const { data } = await api.delete(`/admin/instituicoes/${id}`);
  return data;
}

// --- Setores ---------------------------------------------------------------

export async function listarSetores(instituicaoId) {
  const { data } = await api.get("/admin/setores", {
    params: instituicaoId ? { instituicao_id: instituicaoId } : {},
  });
  return data;
}

export async function criarSetor(setor) {
  const { data } = await api.post("/admin/setores", setor);
  return data;
}

export async function editarSetor(id, alteracoes) {
  const { data } = await api.put(`/admin/setores/${id}`, alteracoes);
  return data;
}

// --- Questionários -----------------------------------------------------

export async function listarQuestionarios() {
  const { data } = await api.get("/admin/questionarios");
  return data;
}

export async function criarQuestionario(questionario) {
  const { data } = await api.post("/admin/questionarios", questionario);
  return data;
}

export async function editarQuestionario(id, alteracoes) {
  const { data } = await api.put(`/admin/questionarios/${id}`, alteracoes);
  return data;
}

export async function excluirQuestionario(id) {
  const { data } = await api.delete(`/admin/questionarios/${id}`);
  return data;
}

// --- Criação assistida de questionário (IA) -------------------------------

export async function obterStatusSugestaoQuestionario() {
  const { data } = await api.get("/admin/ia/questionario/status");
  return data;
}

export async function gerarSugestaoQuestionario(pedido, instrumentoPreferido) {
  const { data } = await api.post("/admin/ia/questionario/sugestao", {
    pedido,
    instrumento_preferido: instrumentoPreferido || null,
  });
  return data;
}

// --- Usuários e vínculos -----------------------------------------------

export async function listarUsuarios() {
  const { data } = await api.get("/admin/usuarios");
  return data;
}

export async function criarUsuario(usuario) {
  const { data } = await api.post("/admin/usuarios", usuario);
  return data;
}

export async function editarUsuario(id, alteracoes) {
  const { data } = await api.put(`/admin/usuarios/${id}`, alteracoes);
  return data;
}

export async function desativarUsuario(id) {
  const { data } = await api.delete(`/admin/usuarios/${id}`);
  return data;
}

export async function vincularInstituicoes(usuarioId, instituicaoIds) {
  const { data } = await api.post(`/admin/usuarios/${usuarioId}/vinculos`, {
    instituicao_ids: instituicaoIds,
  });
  return data;
}

export async function desvincularInstituicao(usuarioId, instituicaoId) {
  const { data } = await api.delete(`/admin/usuarios/${usuarioId}/vinculos/${instituicaoId}`);
  return data;
}

// --- Resultados (qualquer instituição) ----------------------------------

export async function obterResultados(instituicaoId) {
  const { data } = await api.get(`/admin/instituicoes/${instituicaoId}/resultados`);
  return data;
}

// Dashboard "Resultados" (multi-instituição/setor/questionário/instrumento)
// — diferente de obterResultados acima, que é escopado a uma instituição só.
// Usa URLSearchParams em vez de deixar o axios serializar os arrays
// sozinho: o padrão do axios é `chave[]=1&chave[]=2`, mas o backend
// (Pydantic/flask-openapi3) só entende `chave=1&chave=2` (confirmado
// testando a rota) — passar um URLSearchParams pronto faz o axios usá-lo
// como está, sem re-serializar.
export async function obterResultadosDashboard({
  instituicaoIds = [],
  setorIds = [],
  questionarioIds = [],
  instrumento = "",
} = {}) {
  const params = new URLSearchParams();
  instituicaoIds.forEach((id) => params.append("instituicao_ids", id));
  setorIds.forEach((id) => params.append("setor_ids", id));
  questionarioIds.forEach((id) => params.append("questionario_ids", id));
  if (instrumento) params.append("instrumento", instrumento);

  const { data } = await api.get("/admin/resultados", { params });
  return data;
}

// --- Exportação CSV ------------------------------------------------------

// Só deve ser chamada após confirmação explícita do usuário na UI — ver
// ExportacaoPage.jsx. `confirmo_export_dados_sensiveis: true` é enviado
// sempre aqui porque esta função só é invocada depois que a tela já
// coletou essa confirmação; a rota não é disparada em nenhum outro lugar.
export async function exportarRespostasCsv({ instituicaoId, setorId, questionarioId }) {
  const params = { confirmo_export_dados_sensiveis: true };
  if (instituicaoId) params.instituicao_id = instituicaoId;
  if (setorId) params.setor_id = setorId;
  if (questionarioId) params.questionario_id = questionarioId;

  const resposta = await api.get("/admin/respostas/export", {
    params,
    responseType: "blob",
  });

  const disposicao = resposta.headers["content-disposition"] || "";
  const nomeCasado = disposicao.match(/filename=([^;]+)/);
  const nomeArquivo = nomeCasado ? nomeCasado[1].trim() : "respostas_brutas.csv";

  return { blob: resposta.data, nomeArquivo };
}

// --- Configurações -----------------------------------------------------

export async function obterConfiguracoes() {
  const { data } = await api.get("/admin/configuracoes");
  return data;
}

export async function atualizarConfiguracoes(alteracoes) {
  const { data } = await api.put("/admin/configuracoes", alteracoes);
  return data;
}

// --- Log de atividade ----------------------------------------------------

export async function listarLogs(filtros = {}) {
  const { data } = await api.get("/admin/logs", { params: filtros });
  return data;
}

// --- Estatísticas (painel do Administrador) -------------------------------

export async function obterEstatisticas() {
  const { data } = await api.get("/admin/estatisticas");
  return data;
}

// --- Memória institucional ------------------------------------------------

export async function listarMemoria(instituicaoId) {
  const { data } = await api.get("/admin/memoria", {
    params: instituicaoId ? { instituicao_id: instituicaoId } : {},
  });
  return data;
}

export async function criarMemoria(registro) {
  const { data } = await api.post("/admin/memoria", registro);
  return data;
}
