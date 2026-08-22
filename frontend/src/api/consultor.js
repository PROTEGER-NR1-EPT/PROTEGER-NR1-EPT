// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { api } from "./client";

export async function listarMinhasInstituicoes() {
  const { data } = await api.get("/consultor/instituicoes");
  return data;
}

export async function obterResultados(instituicaoId) {
  const { data } = await api.get(`/consultor/instituicoes/${instituicaoId}/resultados`);
  return data;
}

export async function obterResultadosDashboard(instituicaoId) {
  const { data } = await api.get(`/consultor/instituicoes/${instituicaoId}/resultados-dashboard`);
  return data;
}

export async function obterMemoria(instituicaoId) {
  const { data } = await api.get(`/consultor/instituicoes/${instituicaoId}/memoria`);
  return data;
}

export async function listarPlanos(instituicaoId) {
  const { data } = await api.get(`/consultor/instituicoes/${instituicaoId}/planos-acao`);
  return data;
}

export async function listarAcoes(planoId) {
  const { data } = await api.get(`/consultor/planos-acao/${planoId}/acoes`);
  return data;
}
