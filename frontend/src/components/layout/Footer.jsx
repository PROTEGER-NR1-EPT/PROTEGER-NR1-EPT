// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

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
