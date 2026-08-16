import { useEffect, useRef } from "react";

import { Button } from "../forms/Button";
import styles from "./ConfirmModal.module.css";

// Modal genérico de confirmação para ações destrutivas (ex.: excluir um
// questionário) — mesmo padrão de acessibilidade das outras sobreposições
// do projeto (AcessibilidadeWidget.jsx, PreviewQuestionario.jsx): fecha com
// Escape ou clique fora, foco vai para o painel ao abrir.
export function ConfirmModal({
  aberto,
  titulo,
  children,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  perigo = false,
  confirmando = false,
  onConfirmar,
  onCancelar,
}) {
  const painelRef = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    painelRef.current?.focus();

    function handleKeyDown(evento) {
      if (evento.key === "Escape") onCancelar();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [aberto, onCancelar]);

  if (!aberto) return null;

  return (
    <div
      className={styles.sobreposicao}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCancelar();
      }}
    >
      <div
        ref={painelRef}
        className={styles.painel}
        role="alertdialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
      >
        <h2 className={styles.titulo}>{titulo}</h2>
        <div className={styles.corpo}>{children}</div>
        <div className={styles.acoes}>
          <Button type="button" variante="secundario" onClick={onCancelar}>
            {textoCancelar}
          </Button>
          <Button
            type="button"
            variante={perigo ? "perigo" : "primario"}
            onClick={onConfirmar}
            disabled={confirmando}
          >
            {confirmando ? "Excluindo..." : textoConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}
