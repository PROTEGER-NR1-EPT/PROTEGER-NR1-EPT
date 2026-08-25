// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useState } from "react";

import styles from "./CarregandoSessao.module.css";

// Mostrado por PublicRoute/ProtectedRoute enquanto AuthContext restaura a
// sessão (GET /auth/sessao) ao carregar a página. Em produção o backend
// (Render, plano free) "dorme" após um período sem tráfego e pode levar
// dezenas de segundos para acordar na primeira requisição — sem este aviso,
// a tela fica em branco (Header/Footer só, `main` vazio) por todo esse
// tempo, o que parece uma trava. Os tempos abaixo evitam um flash da
// mensagem no caminho comum (conexão rápida) e escalam o texto só se a
// espera for mesmo incomum.
const ATRASO_MENSAGEM_MS = 1200;
const ATRASO_MENSAGEM_LONGA_MS = 6000;

export function CarregandoSessao() {
  const [fase, setFase] = useState("silencioso");

  useEffect(() => {
    const timerMensagem = setTimeout(() => setFase("conectando"), ATRASO_MENSAGEM_MS);
    const timerMensagemLonga = setTimeout(() => setFase("demorando"), ATRASO_MENSAGEM_LONGA_MS);
    return () => {
      clearTimeout(timerMensagem);
      clearTimeout(timerMensagemLonga);
    };
  }, []);

  if (fase === "silencioso") {
    return null;
  }

  return (
    <section className={styles.secao} role="status" aria-live="polite">
      <div className="container">
        <div className={styles.cartao}>
          <span className={styles.spinner} aria-hidden="true" />
          <p className={styles.mensagem}>Conectando ao servidor...</p>
          {fase === "demorando" && (
            <p className={styles.mensagemSecundaria}>
              Isso está demorando mais que o normal. O servidor pode estar iniciando após um
              período sem uso — aguarde mais alguns instantes.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
