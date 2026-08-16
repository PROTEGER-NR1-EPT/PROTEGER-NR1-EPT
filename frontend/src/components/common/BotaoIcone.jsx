import styles from "./BotaoIcone.module.css";

// Botão de ação icon-only (editar/excluir/...) usado nas tabelas
// administrativas — mesmo tratamento visual em Questionários, Instituições
// e setores, e Usuários. `rotulo` vira tanto o `aria-label` (nome
// acessível, já que o SVG é `aria-hidden`) quanto o `title` (dica ao
// passar o mouse).
export function BotaoIcone({ icone: Icone, rotulo, ...props }) {
  return (
    <button type="button" className={styles.botao} aria-label={rotulo} title={rotulo} {...props}>
      <Icone className={styles.icone} />
    </button>
  );
}
