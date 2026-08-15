import { usePreferences } from "../../hooks/usePreferences";
import styles from "./FontSizeControl.module.css";

// Controles A-/A/A+ (docs/02, eMAG/WCAG) — alteram --font-scale, mantido
// em PreferencesContext (estado de aplicação, nunca localStorage).
export function FontSizeControl() {
  const { diminuirFonte, aumentarFonte, restaurarFonte, podeDiminuirFonte, podeAumentarFonte } =
    usePreferences();

  return (
    <div className={styles.grupo} role="group" aria-label="Tamanho da fonte">
      <span className={styles.rotulo} aria-hidden="true">
        Fonte:
      </span>
      <button
        type="button"
        className={styles.botao}
        onClick={diminuirFonte}
        disabled={!podeDiminuirFonte}
        aria-label="Diminuir tamanho da fonte"
      >
        A-
      </button>
      <button
        type="button"
        className={styles.botao}
        onClick={restaurarFonte}
        aria-label="Tamanho de fonte padrão"
      >
        A
      </button>
      <button
        type="button"
        className={styles.botao}
        onClick={aumentarFonte}
        disabled={!podeAumentarFonte}
        aria-label="Aumentar tamanho da fonte"
      >
        A+
      </button>
    </div>
  );
}
