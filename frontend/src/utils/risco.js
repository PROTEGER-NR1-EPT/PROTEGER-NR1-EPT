// Espelha, no cliente, a mesma classificação de 4 níveis que o backend
// calcula em services/instrumentos/calcular_risco_dominio (só usado aqui
// para agregações feitas no cliente — ex.: média de risco por dimensão no
// radar — o valor/nível de cada linha individual já vem pronto da API).
export function classificarNivelRisco(risco) {
  if (risco <= 25) return "baixo";
  if (risco <= 50) return "moderado";
  if (risco <= 75) return "alto";
  return "critico";
}

export const ROTULO_NIVEL_RISCO = {
  baixo: "Baixo",
  moderado: "Moderado",
  alto: "Alto",
  critico: "Crítico",
};

const VAR_COR_POR_NIVEL = {
  baixo: "--cor-sucesso",
  moderado: "--cor-risco-moderado",
  alto: "--cor-risco-alto",
  critico: "--cor-perigo",
};

export function corPorNivelRisco(nivel) {
  return VAR_COR_POR_NIVEL[nivel] ?? "--cor-texto-secundario";
}
