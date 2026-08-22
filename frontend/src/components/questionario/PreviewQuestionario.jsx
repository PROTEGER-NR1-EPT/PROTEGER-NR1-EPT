// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useMemo, useRef, useState } from "react";

import styles from "./PreviewQuestionario.module.css";

// Reproduz no cliente a mesma ordenação que o backend calcula em
// app/blueprints/publico.py:_montar_itens_em_ordem — "blocos" concatena os
// domínios (na ordem em que estão na lista) e dentro de cada um os itens;
// "intercalado" alterna item a item entre os domínios (round-robin). Só
// para pré-visualização: quem decide a ordem real que o respondente vê é o
// backend.
function montarItensEmOrdem(dominios, modoApresentacao) {
  if (modoApresentacao !== "intercalado") {
    return dominios.flatMap((dominio) => dominio.itens);
  }
  const filas = dominios.map((dominio) => dominio.itens);
  const maiorFila = filas.reduce((maior, fila) => Math.max(maior, fila.length), 0);
  const resultado = [];
  for (let indice = 0; indice < maiorFila; indice += 1) {
    filas.forEach((fila) => {
      if (fila[indice]) resultado.push(fila[indice]);
    });
  }
  return resultado;
}

export function PreviewQuestionario({ aberto, onFechar, titulo, dominios, modoApresentacao }) {
  const [respostas, setRespostas] = useState({});
  const botaoFecharRef = useRef(null);

  const itens = useMemo(
    () => (aberto ? montarItensEmOrdem(dominios, modoApresentacao) : []),
    [aberto, dominios, modoApresentacao]
  );

  useEffect(() => {
    if (!aberto) return;
    setRespostas({});
    botaoFecharRef.current?.focus();

    function handleKeyDown(evento) {
      if (evento.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  const totalRespondidas = Object.keys(respostas).length;

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
        aria-label={`Pré-visualização: ${titulo || "questionário"}`}
      >
        <div className={styles.cabecalho}>
          <div>
            <p className={styles.aviso}>Visualização — nenhuma resposta é salva</p>
            <h2 className={styles.titulo}>{titulo || "Questionário"}</h2>
          </div>
          <button
            ref={botaoFecharRef}
            type="button"
            className={styles.botaoFechar}
            onClick={onFechar}
            aria-label="Fechar pré-visualização"
          >
            ×
          </button>
        </div>

        <div className={styles.corpo}>
          {itens.length === 0 ? (
            <p className={styles.semItens}>Nenhum item cadastrado ainda.</p>
          ) : (
            itens.map((item, indice) => {
              const escalaMin = item.escala_min ?? 1;
              const escalaMax = item.escala_max ?? 5;
              return (
                <fieldset key={item._idLocal ?? item.id ?? indice} className={styles.item}>
                  <legend className={styles.textoItem}>{item.texto || "(sem texto)"}</legend>
                  <div className={styles.escala}>
                    {Array.from(
                      { length: Math.max(0, escalaMax - escalaMin + 1) },
                      (_, i) => escalaMin + i
                    ).map((valor) => (
                      <label key={valor} className={styles.opcaoEscala}>
                        <input
                          type="radio"
                          className={styles.inputEscala}
                          name={`preview-item-${indice}`}
                          checked={respostas[indice] === valor}
                          onChange={() =>
                            setRespostas((atual) => ({ ...atual, [indice]: valor }))
                          }
                        />
                        <span className={styles.bolhaEscala}>{valor}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            })
          )}
        </div>

        <div className={styles.rodape}>
          <span className={styles.progresso}>
            {totalRespondidas} de {itens.length} respondidas (não salvo)
          </span>
        </div>
      </div>
    </div>
  );
}
