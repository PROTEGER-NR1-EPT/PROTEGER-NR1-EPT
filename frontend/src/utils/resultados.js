// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

/**
 * Não estava na lista de arquivos pedida, mas evita duplicar esta lógica
 * entre ResultadosInstituicao.jsx (Consultor) e a tela de resultados do
 * Administrador.
 *
 * A API de resultados (docs/07) devolve linhas "achatadas" — sem nome do
 * domínio nem do instrumento, só ids e o `valor_agregado` calculado (ver
 * backend/app/services/k_anonimato.py e backend/app/services/instrumentos/).
 * Por isso o tipo de cada linha é inferido pelo FORMATO do valor
 * agregado, não por um campo explícito:
 *
 * - `resultado_disponivel: false`               → indisponível (k-anonimato)
 * - valor_agregado tem `quadrante`               → Karasek, linha geral (dominio_id nulo)
 * - valor_agregado tem `escore` + `faixa`        → COPSOQ, um domínio
 * - valor_agregado tem `classificacao`           → Karasek, um domínio (demanda OU controle)
 *
 * A linha "Karasek por domínio" é redundante com a linha geral (que já
 * traz demanda_media/controle_media) e por isso é classificada à parte,
 * para as telas poderem pular sua renderização sem duplicar informação.
 */
export function classificarResultado(resultado) {
  if (!resultado.resultado_disponivel) {
    return "indisponivel";
  }
  const valor = resultado.valor_agregado ?? {};
  if ("quadrante" in valor) return "karasek_geral";
  if ("escore" in valor && "faixa" in valor) return "copsoq_dominio";
  if ("classificacao" in valor) return "karasek_dominio";
  return "desconhecido";
}
