import { useState } from "react";

import { formatarDataBR } from "../../utils/data";
import { STATUS_ACAO } from "../../utils/statusAcao";
import styles from "./KanbanAcoes.module.css";

// Drag & drop com a API nativa do HTML5 (draggable/onDragStart/onDrop) —
// sem dependência nova, mesmo espírito zero-dependência do projeto para
// mecânica de UI que não é gráfico (diferente do radar de Resultados, que
// justificou instalar recharts).
export function KanbanAcoes({ acoes, onEditar, onMoverStatus, somenteLeitura }) {
  const [arrastandoId, setArrastandoId] = useState(null);
  const [colunaSobre, setColunaSobre] = useState(null);

  function handleDrop(status, evento) {
    evento.preventDefault();
    setColunaSobre(null);
    if (arrastandoId != null) {
      onMoverStatus(arrastandoId, status);
    }
    setArrastandoId(null);
  }

  return (
    <div className={styles.colunas}>
      {STATUS_ACAO.map((coluna) => {
        const itens = acoes
          .filter((acao) => acao.status === coluna.valor)
          .sort((a, b) => a.ordem - b.ordem);

        return (
          <div
            key={coluna.valor}
            className={`${styles.coluna} ${colunaSobre === coluna.valor ? styles.colunaSobre : ""}`}
            onDragOver={
              somenteLeitura
                ? undefined
                : (evento) => {
                    evento.preventDefault();
                    setColunaSobre(coluna.valor);
                  }
            }
            onDragLeave={
              somenteLeitura
                ? undefined
                : () => setColunaSobre((atual) => (atual === coluna.valor ? null : atual))
            }
            onDrop={somenteLeitura ? undefined : (evento) => handleDrop(coluna.valor, evento)}
          >
            <div className={styles.cabecalhoColuna}>
              <span
                className={styles.pontoStatus}
                style={{ background: `var(${coluna.cor})` }}
                aria-hidden="true"
              />
              <h3 className={styles.tituloColuna}>{coluna.rotulo}</h3>
              <span className={styles.contadorColuna}>{itens.length}</span>
            </div>

            <div className={styles.listaCartoes}>
              {itens.length === 0 && <p className={styles.colunaVazia}>Nenhuma ação</p>}
              {itens.map((acao) => {
                const totalTarefas = acao.tarefas?.length ?? 0;
                const tarefasConcluidas =
                  acao.tarefas?.filter((t) => t.concluida).length ?? 0;
                return (
                  <div
                    key={acao.id}
                    className={styles.cartao}
                    draggable={!somenteLeitura}
                    onDragStart={somenteLeitura ? undefined : () => setArrastandoId(acao.id)}
                    onDragEnd={somenteLeitura ? undefined : () => setArrastandoId(null)}
                    onClick={() => onEditar(acao)}
                  >
                    <p className={styles.cartaoTitulo}>{acao.titulo}</p>
                    <div className={styles.cartaoMeta}>
                      {acao.tag && <span className={styles.tagChip}>{acao.tag}</span>}
                      {acao.prazo && (
                        <span className={styles.prazo}>{formatarDataBR(acao.prazo)}</span>
                      )}
                    </div>
                    <div className={styles.cartaoRodape}>
                      <span>{acao.responsavel || ""}</span>
                      {totalTarefas > 0 && (
                        <span className={styles.progressoTarefas}>
                          {tarefasConcluidas}/{totalTarefas}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
