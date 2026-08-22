// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { api } from "./client";

export async function listarInstituicoes() {
  const { data } = await api.get("/instituicoes");
  return data;
}

export async function listarSetores(instituicaoId) {
  const { data } = await api.get(`/instituicoes/${instituicaoId}/setores`);
  return data;
}

export async function obterQuestionarioAtivo(instituicaoId, setorId) {
  const { data } = await api.get("/questionarios/ativo", {
    params: { instituicao_id: instituicaoId, setor_id: setorId },
  });
  return data;
}

export async function enviarRespostas({ questionarioId, instituicaoId, setorId, respostas }) {
  const { data } = await api.post("/respostas", {
    questionario_id: questionarioId,
    instituicao_id: instituicaoId,
    setor_id: setorId,
    respostas,
  });
  return data;
}
