// Formata uma data ISO (YYYY-MM-DD, como vem de <input type="date"> e da
// API) para DD/MM/AAAA — usado nas 3 visualizações de Planos de Ação
// (Kanban, Tabela, Calendário).
export function formatarDataBR(iso) {
  if (!iso) return null;
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}
