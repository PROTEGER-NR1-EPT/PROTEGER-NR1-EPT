import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.rodape}>
      <div className="container">
        <p>
          PROTEGER-NR1 EPT — produto educacional para identificação e
          prevenção de riscos psicossociais (NR-1) em instituições de
          Educação Profissional e Tecnológica.
        </p>
      </div>
    </footer>
  );
}
