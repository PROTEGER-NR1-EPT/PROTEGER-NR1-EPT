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

// --- Usuários e vínculos -----------------------------------------------

export async function listarUsuarios() {
  const { data } = await api.get("/admin/usuarios");
  return data;
}

export async function criarUsuario(usuario) {
  const { data } = await api.post("/admin/usuarios", usuario);
  return data;
}

export async function vincularInstituicoes(usuarioId, instituicaoIds) {
  const { data } = await api.post(`/admin/usuarios/${usuarioId}/vinculos`, {
    instituicao_ids: instituicaoIds,
  });
  return data;
}

// --- Resultados (qualquer instituição) ----------------------------------

export async function obterResultados(instituicaoId) {
  const { data } = await api.get(`/admin/instituicoes/${instituicaoId}/resultados`);
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
