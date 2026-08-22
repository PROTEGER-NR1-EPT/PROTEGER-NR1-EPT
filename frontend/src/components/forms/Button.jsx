// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import styles from "./Button.module.css";

/**
 * Não estava na lista de arquivos pedida, mas evita repetir a mesma
 * estilização de botão em toda página/formulário do projeto.
 */
export function Button({ variante = "primario", type = "button", className = "", ...props }) {
  const classeVariante = styles[variante] ?? styles.primario;
  return (
    <button type={type} className={`${styles.botao} ${classeVariante} ${className}`} {...props} />
  );
}
