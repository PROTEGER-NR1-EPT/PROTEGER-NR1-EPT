// Status de uma ação de Plano de Ação — 3 valores fixos (backend valida o
// mesmo conjunto em STATUS_ACAO_VALIDOS, models/memoria.py). Cores
// reaproveitadas de tokens.css (sem token novo): pendente=atenção,
// em andamento=primária, concluído=sucesso.
export const STATUS_ACAO = [
  { valor: "pendente", rotulo: "Pendente", cor: "--cor-atencao" },
  { valor: "em_andamento", rotulo: "Em andamento", cor: "--cor-primaria" },
  { valor: "concluido", rotulo: "Concluído", cor: "--cor-sucesso" },
];

export function rotuloStatus(status) {
  return STATUS_ACAO.find((s) => s.valor === status)?.rotulo ?? status;
}

export function corStatus(status) {
  return STATUS_ACAO.find((s) => s.valor === status)?.cor ?? "--cor-texto-secundario";
}
