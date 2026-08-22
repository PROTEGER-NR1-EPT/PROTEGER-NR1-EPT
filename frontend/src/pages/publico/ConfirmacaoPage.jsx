// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

import { Button } from "../../components/forms/Button";
import styles from "./ConfirmacaoPage.module.css";

function IconeSucesso() {
  return (
    <svg viewBox="0 0 24 24" className={styles.iconeCartao} aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 12.5l2.5 2.5L16 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ConfirmacaoPage() {
  const { limparFluxo } = useOutletContext();
  const navigate = useNavigate();

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
        <div className={styles.cartao}>
          <IconeSucesso />
          <h1 className={styles.titulo}>Respostas enviadas — obrigado!</h1>
          <p className={styles.introducao}>
            Sua participação é muito importante para a prevenção de riscos psicossociais na sua
            instituição. Nenhuma informação enviada pode ser associada a você.
          </p>
          <Button className={styles.botaoVoltar} onClick={() => navigate("/")}>
            Voltar ao início
          </Button>
        </div>
      </div>
    </section>
  );
}
