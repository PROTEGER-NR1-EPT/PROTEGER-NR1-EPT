// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useState } from "react";

import { BotaoIcone } from "./BotaoIcone";
import { HelpModal } from "./HelpModal";
import { IconeAjuda } from "./icones";
import styles from "./PageHeader.module.css";

// Título padrão de cada tela logada (Admin/Consultor), com um botão "?"
// que abre um modal explicando o que a tela mostra e como usá-la —
// `children` é o conteúdo desse modal (parágrafos/listas).
export function PageHeader({ titulo, children }) {
  const [ajudaAberta, setAjudaAberta] = useState(false);

  return (
    <>
      <div className={styles.cabecalho}>
        <h1 className={styles.titulo}>{titulo}</h1>
        <BotaoIcone
          icone={IconeAjuda}
          rotulo={`Ajuda: ${titulo}`}
          onClick={() => setAjudaAberta(true)}
        />
      </div>
      <HelpModal aberto={ajudaAberta} titulo={titulo} onFechar={() => setAjudaAberta(false)}>
        {children}
      </HelpModal>
    </>
  );
}
