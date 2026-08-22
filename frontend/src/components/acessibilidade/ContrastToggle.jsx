// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { usePreferences } from "../../hooks/usePreferences";
import styles from "./FontSizeControl.module.css";

// Modo alto contraste (docs/02, eMAG/WCAG) — alterna [data-contraste="alto"]
// em <html>, mantido em PreferencesContext (estado de aplicação, nunca
// localStorage). Reaproveita o mesmo .botao de FontSizeControl.module.css
// para manter o mesmo estilo visual dos controles de acessibilidade.
export function ContrastToggle() {
  const { altoContraste, alternarContraste } = usePreferences();

  return (
    <button
      type="button"
      className={styles.botao}
      onClick={alternarContraste}
      aria-pressed={altoContraste}
    >
      {altoContraste ? "Contraste normal" : "Alto contraste"}
    </button>
  );
}
