import styles from "./ResultadoIndisponivel.module.css";

/**
 * Renderizado sempre que `resultado_disponivel: false` (docs/05, regra de
 * k-anonimato) — nunca tentar ler `valor_agregado` nesse caso, ele vem
 * `null` de propósito, mesmo que o valor exista internamente no backend.
 */
export function ResultadoIndisponivel({ resultado }) {
  return (
    <div className={styles.aviso} role="status">
      <p>
        <strong>Dados insuficientes para exibição.</strong>
      </p>
      <p>
        São necessárias pelo menos {resultado.threshold} respostas neste
        grupo para proteger o anonimato de quem respondeu; até agora há{" "}
        {resultado.n_respostas}.
      </p>
    </div>
  );
}
