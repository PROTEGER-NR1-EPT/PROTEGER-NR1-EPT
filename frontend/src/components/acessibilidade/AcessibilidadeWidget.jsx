import { useEffect, useRef, useState } from "react";

import { ContrastToggle } from "./ContrastToggle";
import { FontSizeControl } from "./FontSizeControl";
import styles from "./AcessibilidadeWidget.module.css";

// Substitui a barra de controles sempre visível (antiga
// .ferramentasAcessibilidade em Header.jsx) por um ícone flutuante no
// canto superior direito que abre um painel — mesmo padrão visual de
// widgets de acessibilidade como o do paralympic.org, mas só com os 2
// controles que o projeto já implementa (docs/02: tamanho de fonte
// A-/A/A+ e alto contraste). Não adiciona nenhuma funcionalidade nova,
// só reorganiza a apresentação das duas já existentes.
export function AcessibilidadeWidget() {
  const [aberto, setAberto] = useState(false);
  const painelRef = useRef(null);
  const botaoRef = useRef(null);

  useEffect(() => {
    if (!aberto) return;

    function handlePointerDown(evento) {
      if (
        painelRef.current &&
        !painelRef.current.contains(evento.target) &&
        !botaoRef.current.contains(evento.target)
      ) {
        setAberto(false);
      }
    }

    function handleKeyDown(evento) {
      if (evento.key === "Escape") {
        setAberto(false);
        botaoRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [aberto]);

  function fechar() {
    setAberto(false);
    botaoRef.current?.focus();
  }

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        className={styles.botaoFlutuante}
        onClick={() => setAberto((atual) => !atual)}
        aria-expanded={aberto}
        aria-haspopup="true"
        aria-controls="painel-acessibilidade"
        aria-label="Abrir menu de acessibilidade"
      >
        <IconeAcessibilidade />
        <span className={styles.dica} aria-hidden="true">
          Menu de acessibilidade
        </span>
      </button>

      {aberto && (
        <div
          id="painel-acessibilidade"
          ref={painelRef}
          role="region"
          aria-label="Menu de acessibilidade"
          className={styles.painel}
        >
          <div className={styles.cabecalhoPainel}>
            <h2 className={styles.tituloPainel}>Acessibilidade</h2>
            <button
              type="button"
              className={styles.botaoFechar}
              onClick={fechar}
              aria-label="Fechar menu de acessibilidade"
            >
              ×
            </button>
          </div>

          <div className={styles.corpoPainel}>
            <FontSizeControl />
            <hr className={styles.divisor} />
            <ContrastToggle />
          </div>
        </div>
      )}
    </>
  );
}

function IconeAcessibilidade() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icone} aria-hidden="true" focusable="false">
      <circle cx="12" cy="5" r="2" fill="currentColor" />
      <path
        d="M5 9h14M12 9v6M12 15l-4 6M12 15l4 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
