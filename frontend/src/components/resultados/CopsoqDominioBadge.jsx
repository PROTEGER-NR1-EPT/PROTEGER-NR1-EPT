import styles from "./CopsoqDominioBadge.module.css";

const ROTULO_FAIXA = {
  verde: "Favorável",
  amarelo: "Atenção",
  vermelho: "Desfavorável",
};

/**
 * `resultado` é um item de /resultados cujo valor_agregado tem as chaves
 * `escore` (0–100) e `faixa` (verde/amarelo/vermelho) — um domínio do
 * COPSOQ (docs/06).
 *
 * Limitação conhecida: a API de resultados (docs/07) não devolve o nome
 * do domínio, só `dominio_id` — nomear os domínios exigiria uma rota
 * adicional (hoje só o Administrador tem acesso a
 * GET /admin/questionarios, que não é chamável pelo Consultor). Até essa
 * lacuna ser fechada no backend, o badge identifica o domínio pelo id.
 */
export function CopsoqDominioBadge({ resultado }) {
  const { escore, faixa } = resultado.valor_agregado;
  const classeFaixa = styles[faixa] ?? "";

  return (
    <div className={styles.badge}>
      <span>Domínio #{resultado.dominio_id}</span>
      <span className={styles.escore}>{escore}</span>
      <span className={`${styles.faixa} ${classeFaixa}`}>
        <span className={styles.pontoFaixa} aria-hidden="true" />
        {ROTULO_FAIXA[faixa] ?? faixa}
      </span>
      <span className={styles.rodape}>{resultado.n_respostas} respostas</span>
    </div>
  );
}
