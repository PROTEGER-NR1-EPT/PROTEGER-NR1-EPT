// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

// Formata uma data ISO (YYYY-MM-DD, como vem de <input type="date"> e da
// API) para DD/MM/AAAA — usado nas 3 visualizações de Planos de Ação
// (Kanban, Tabela, Calendário).
export function formatarDataBR(iso) {
  if (!iso) return null;
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}
