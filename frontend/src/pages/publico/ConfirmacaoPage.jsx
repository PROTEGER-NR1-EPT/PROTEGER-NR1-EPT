import { useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";

import styles from "./LandingPage.module.css";

export function ConfirmacaoPage() {
  const { limparFluxo } = useOutletContext();

  // Limpa instituição/setor/questionário só depois de já estar nesta
  // página (não em QuestionarioPage antes de navegar para cá) — ver
  // comentário em QuestionarioPage.jsx:handleEnviar sobre a corrida que
  // isso evita com o guard de "instituição/setor ausente" das outras
  // páginas do fluxo.
  useEffect(() => {
    limparFluxo();
  }, [limparFluxo]);

  return (
    <section className={styles.secao}>
      <div className="container">
        <h1 className={styles.titulo}>Respostas enviadas — obrigado!</h1>
        <p className={styles.introducao}>
          Sua participação é muito importante para a prevenção de riscos
          psicossociais na sua instituição. Nenhuma informação enviada pode
          ser associada a você.
        </p>
        <Link to="/">Voltar ao início</Link>
      </div>
    </section>
  );
}
