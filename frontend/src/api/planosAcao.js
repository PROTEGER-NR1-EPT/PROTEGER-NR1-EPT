import { api } from "./client";

// --- Planos (ciclos) -------------------------------------------------------

export async function listarPlanos(instituicaoId) {
  const { data } = await api.get(`/admin/instituicoes/${instituicaoId}/planos-acao`);
  return data;
}

export async function criarPlano(instituicaoId, ciclo) {
  const { data } = await api.post(`/admin/instituicoes/${instituicaoId}/planos-acao`, { ciclo });
  return data;
}

// --- Ações -------------------------------------------------------------

export async function listarAcoes(planoId) {
  const { data } = await api.get(`/admin/planos-acao/${planoId}/acoes`);
  return data;
}

export async function criarAcao(planoId, acao) {
  const { data } = await api.post(`/admin/planos-acao/${planoId}/acoes`, acao);
  return data;
}

export async function editarAcao(acaoId, alteracoes) {
  const { data } = await api.put(`/admin/acoes/${acaoId}`, alteracoes);
  return data;
}

export async function excluirAcao(acaoId) {
  const { data } = await api.delete(`/admin/acoes/${acaoId}`);
  return data;
}

export async function editarTarefa(tarefaId, concluida) {
  const { data } = await api.put(`/admin/tarefas/${tarefaId}`, { concluida });
  return data;
}

export async function gerarSugestoes(planoId) {
  const { data } = await api.post(`/admin/planos-acao/${planoId}/gerar-sugestoes`);
  return data;
}
