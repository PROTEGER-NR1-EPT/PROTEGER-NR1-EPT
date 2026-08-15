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
