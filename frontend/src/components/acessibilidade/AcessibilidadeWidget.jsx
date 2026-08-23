// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

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
// Abaixo de 640px o botão vira arrastável verticalmente (segurar e
// arrastar), pra quem estiver com o dedo ocupando o topo/base da tela
// poder tirar o ícone da frente de outra coisa. `null` = ainda não foi
// arrastado, usa a posição inicial definida no CSS.
const LARGURA_MOBILE = "(max-width: 639px)";
const LIMIAR_ARRASTE_PX = 6;
const MARGEM_TOPO_PX = 88; // abaixo do cabeçalho, mesmo valor do CSS (--espaco-3 + 4.5rem)
const MARGEM_BORDA_PX = 16;

export function AcessibilidadeWidget() {
  const [aberto, setAberto] = useState(false);
  const [topoPx, setTopoPx] = useState(null);
  const painelRef = useRef(null);
  const botaoRef = useRef(null);
  const arrasteRef = useRef({ ativo: false, moveu: false, inicioY: 0, inicioTopo: 0 });

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

  // Segurar e arrastar o próprio ícone (só em mobile) pra reposicionar
  // verticalmente. Um toque/clique rápido (sem mover além do limiar)
  // continua abrindo o painel normalmente.
  function iniciarArraste(evento) {
    if (!window.matchMedia(LARGURA_MOBILE).matches) return;
    const topoAtual = botaoRef.current.getBoundingClientRect().top;
    arrasteRef.current = { ativo: true, moveu: false, inicioY: evento.clientY, inicioTopo: topoAtual };
    document.addEventListener("pointermove", moverArraste);
    document.addEventListener("pointerup", finalizarArraste);
  }

  function moverArraste(evento) {
    const estado = arrasteRef.current;
    if (!estado.ativo) return;
    const delta = evento.clientY - estado.inicioY;
    if (!estado.moveu && Math.abs(delta) < LIMIAR_ARRASTE_PX) return;
    estado.moveu = true;

    const alturaBotao = botaoRef.current.offsetHeight;
    const maximo = window.innerHeight - alturaBotao - MARGEM_BORDA_PX;
    const novoTopo = Math.min(Math.max(estado.inicioTopo + delta, MARGEM_TOPO_PX), maximo);
    setTopoPx(novoTopo);
  }

  function finalizarArraste() {
    document.removeEventListener("pointermove", moverArraste);
    document.removeEventListener("pointerup", finalizarArraste);
    arrasteRef.current.ativo = false;
  }

  function alternarPainel() {
    if (arrasteRef.current.moveu) {
      arrasteRef.current.moveu = false;
      return;
    }
    setAberto((atual) => !atual);
  }

  const estiloPainel = calcularEstiloPainel(topoPx, botaoRef.current?.offsetHeight);

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        className={styles.botaoFlutuante}
        style={topoPx !== null ? { top: `${topoPx}px` } : undefined}
        onPointerDown={iniciarArraste}
        onClick={alternarPainel}
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
          style={estiloPainel}
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

// Depois que o botão é arrastado (topoPx !== null), o painel abre relativo
// à posição de fato do botão em vez do offset fixo do CSS — pra cima se o
// botão estiver na metade de baixo da tela, pra baixo caso contrário —
// sempre limitando a altura pra não estourar a viewport.
function calcularEstiloPainel(topoPx, alturaBotao = 40) {
  if (topoPx === null) return undefined;

  const gap = 8;
  const abrirAbaixo = topoPx < window.innerHeight / 2;

  if (abrirAbaixo) {
    const topo = topoPx + alturaBotao + gap;
    return { top: `${topo}px`, bottom: "auto", maxHeight: `${window.innerHeight - topo - MARGEM_BORDA_PX}px` };
  }

  const distanciaBase = window.innerHeight - topoPx + gap;
  return {
    top: "auto",
    bottom: `${distanciaBase}px`,
    maxHeight: `${topoPx - gap - MARGEM_BORDA_PX}px`,
  };
}
