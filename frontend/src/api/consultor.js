import { api } from "./client";

export async function listarMinhasInstituicoes() {
  const { data } = await api.get("/consultor/instituicoes");
  return data;
}

export async function obterResultados(instituicaoId) {
  const { data } = await api.get(`/consultor/instituicoes/${instituicaoId}/resultados`);
  return data;
}

export async function obterMemoria(instituicaoId) {
  const { data } = await api.get(`/consultor/instituicoes/${instituicaoId}/memoria`);
  return data;
}
