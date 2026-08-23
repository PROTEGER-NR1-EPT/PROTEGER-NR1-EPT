// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useRef } from "react";

import styles from "./HelpModal.module.css";

// Modal genérico só de informação (sem ações de confirmar/cancelar) —
// mesmo padrão de acessibilidade de PreviewQuestionario.jsx: fecha com
// Escape ou clique fora, foco vai pro botão fechar ao abrir.
export function HelpModal({ aberto, titulo, onFechar, children }) {
  const botaoFecharRef = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    botaoFecharRef.current?.focus();

    function handleKeyDown(evento) {
      if (evento.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div
      className={styles.sobreposicao}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onFechar();
      }}
    >
      <div
        className={styles.painel}
        role="dialog"
        aria-modal="true"
        aria-label={`Ajuda: ${titulo}`}
      >
        <div className={styles.cabecalho}>
          <h2 className={styles.titulo}>{titulo}</h2>
          <button
            ref={botaoFecharRef}
            type="button"
            className={styles.botaoFechar}
            onClick={onFechar}
            aria-label="Fechar ajuda"
          >
            ×
          </button>
        </div>
        <div className={styles.corpo}>{children}</div>
      </div>
    </div>
  );
}
