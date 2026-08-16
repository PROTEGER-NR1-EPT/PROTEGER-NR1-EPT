import styles from "./CopsoqDominioBadge.module.css";

const ROTULO_FAIXA = {
  verde: "Favorável",
  amarelo: "Atenção",
  vermelho: "Desfavorável",
};

/**
 * `resultado` é um item de /resultados cujo valor_agregado tem as chaves
 * `escore` (0–100) e `faixa` (verde/amarelo/vermelho) — um domínio do
 * COPSOQ (docs/06). `dominio_nome` vem pronto do backend
 * (app/services/k_anonimato.py:obter_resultados) — Consultor e
 * Administrador têm permissão para ver a identidade do domínio (docs/04).
 */
export function CopsoqDominioBadge({ resultado }) {
  const { escore, faixa } = resultado.valor_agregado;
  const classeFaixa = styles[faixa] ?? "";

  return (
    <div className={styles.badge}>
      <span className={styles.tituloDominio}>{resultado.dominio_nome}</span>
      <span className={styles.escore}>{escore}</span>
      <span className={`${styles.faixa} ${classeFaixa}`}>
        <span className={styles.pontoFaixa} aria-hidden="true" />
        {ROTULO_FAIXA[faixa] ?? faixa}
      </span>
      <span className={styles.rodape}>{resultado.n_respostas} respostas</span>
    </div>
  );
}
