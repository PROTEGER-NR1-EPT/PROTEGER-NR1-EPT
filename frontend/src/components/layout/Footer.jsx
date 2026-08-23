// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import styles from "./Footer.module.css";

const REPO_URL = "https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT";
const WIKI_URL = `${REPO_URL}/wiki`;
const ANO_ATUAL = new Date().getFullYear();

export function Footer() {
  return (
    <footer className={styles.rodape}>
      <div className={`container ${styles.grade}`}>
        <div className={styles.colSobre}>
          <p>
            PROTEGER-NR1 EPT — produto educacional para identificação e
            prevenção de riscos psicossociais (NR-1) em instituições de
            Educação Profissional e Tecnológica.
          </p>
        </div>

        <div className={styles.coluna}>
          <span className={styles.tituloColuna}>Projeto</span>
          <nav className={styles.badges} aria-label="Links do projeto">
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              <img
                src="https://img.shields.io/badge/GitHub-Repositório-181717?logo=github&logoColor=white"
                alt="Repositório no GitHub"
                height="20"
              />
            </a>
            <a href={WIKI_URL} target="_blank" rel="noopener noreferrer">
              <img
                src="https://img.shields.io/badge/GitHub-Wiki-0969DA?logo=github&logoColor=white"
                alt="Wiki do projeto (manual de uso)"
                height="20"
              />
            </a>
          </nav>
        </div>

        <div className={styles.coluna}>
          <span className={styles.tituloColuna}>Licenças</span>
          <div className={styles.badges}>
            <a
              href={`${REPO_URL}/blob/main/LICENSE`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://img.shields.io/badge/code_license-PolyForm_Noncommercial_1.0.0-blue"
                alt="Licença do código: PolyForm Noncommercial 1.0.0"
                height="20"
              />
            </a>
            <a
              href={`${REPO_URL}/blob/main/docs/LICENSE-MATERIAIS.md`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://img.shields.io/badge/content_license-CC_BY--NC--SA_4.0-lightgrey?logo=creativecommons&logoColor=white"
                alt="Licença dos materiais pedagógicos: CC BY-NC-SA 4.0"
                height="20"
              />
            </a>
          </div>
        </div>
      </div>

      <div className={styles.baixo}>
        <div className={`container ${styles.baixoConteudo}`}>
          <span>© {ANO_ATUAL} PROTEGER-NR1 EPT</span>
          <span>Distribuído sob licença não comercial</span>
        </div>
      </div>
    </footer>
  );
}
