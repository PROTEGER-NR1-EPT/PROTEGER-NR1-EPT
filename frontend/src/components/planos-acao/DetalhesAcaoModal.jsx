// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useRef } from "react";

import { Button } from "../forms/Button";
import { formatarDataBR } from "../../utils/data";
import { corStatus, rotuloStatus } from "../../utils/statusAcao";
import chrome from "./AcaoFormModal.module.css";
import styles from "./DetalhesAcaoModal.module.css";

// Visualização somente leitura de uma ação — usada pelo Consultor, que
// pode consultar Planos de Ação das instituições vinculadas mas não
// editá-los (isso continua exclusivo do Administrador, AcaoFormModal.jsx).
// Reaproveita o "chrome" visual do modal de edição (sobreposição, painel,
// cabeçalho/corpo/rodapé) via import direto do mesmo CSS module — só o
// conteúdo do corpo é diferente (texto estático em vez de formulário).
export function DetalhesAcaoModal({ aberto, onFechar, acao }) {
  const painelRef = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    painelRef.current?.focus();

    function handleKeyDown(evento) {
      if (evento.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [aberto, onFechar]);

  if (!aberto || !acao) return null;

  return (
    <div
      className={chrome.sobreposicao}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onFechar();
      }}
    >
      <div
        ref={painelRef}
        className={chrome.painel}
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes da ação: ${acao.titulo}`}
        tabIndex={-1}
      >
        <div className={chrome.cabecalho}>
          <h2 className={chrome.titulo}>Detalhes da ação</h2>
          <button
            type="button"
            className={chrome.botaoFechar}
            onClick={onFechar}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className={chrome.corpo}>
          <h3 className={styles.tituloAcao}>{acao.titulo}</h3>

          <div className={styles.linhaMeta}>
            <span
              className={styles.badgeStatus}
              style={{ background: `var(${corStatus(acao.status)})` }}
            >
              {rotuloStatus(acao.status)}
            </span>
            {acao.tag && <span className={chrome.chip}>{acao.tag}</span>}
            {acao.prazo && <span className={styles.prazo}>Prazo: {formatarDataBR(acao.prazo)}</span>}
          </div>

          {acao.responsavel && (
            <p className={styles.campoTexto}>
              <strong>Responsável:</strong> {acao.responsavel}
            </p>
          )}

          {acao.participantes?.length > 0 && (
            <div className={styles.campoTexto}>
              <strong>Participantes:</strong>
              <div className={chrome.chips}>
                {acao.participantes.map((nome, indice) => (
                  <span key={`${nome}-${indice}`} className={chrome.chip}>
                    {nome}
                  </span>
                ))}
              </div>
            </div>
          )}

          {acao.descricao && (
            <p className={styles.campoTexto}>
              <strong>Descrição:</strong>
              <br />
              {acao.descricao}
            </p>
          )}

          {acao.tarefas?.length > 0 && (
            <div className={chrome.secaoLista}>
              <h3 className={chrome.tituloSecaoLista}>Tarefas</h3>
              <ul className={styles.listaTarefas}>
                {acao.tarefas.map((tarefa) => (
                  <li key={tarefa.id} className={styles.itemTarefa}>
                    <span aria-hidden="true">{tarefa.concluida ? "☑" : "☐"}</span>
                    <span className={tarefa.concluida ? styles.textoConcluido : undefined}>
                      {tarefa.titulo}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {acao.anexos?.length > 0 && (
            <div className={chrome.secaoLista}>
              <h3 className={chrome.tituloSecaoLista}>Anexos</h3>
              <ul className={styles.listaTarefas}>
                {acao.anexos.map((anexo, indice) => (
                  <li key={indice}>
                    <a href={anexo.url} target="_blank" rel="noreferrer">
                      {anexo.titulo || anexo.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {acao.depende_de?.length > 0 && (
            <p className={styles.campoTexto}>
              <strong>Depende de:</strong> {acao.depende_de.map((a) => a.titulo).join(", ")}
            </p>
          )}

          {acao.bloqueia?.length > 0 && (
            <p className={styles.campoTexto}>
              <strong>Bloqueia:</strong> {acao.bloqueia.map((a) => a.titulo).join(", ")}
            </p>
          )}
        </div>

        <div className={chrome.rodape}>
          <Button type="button" variante="secundario" onClick={onFechar}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
