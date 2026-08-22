// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useRef, useState } from "react";

import { Button } from "../forms/Button";
import { STATUS_ACAO } from "../../utils/statusAcao";
import formStyles from "../forms/FormField.module.css";
import styles from "./AcaoFormModal.module.css";

const FORM_VAZIO = {
  titulo: "",
  tag: "",
  status: "pendente",
  prazo: "",
  responsavel: "",
  participantes: [],
  tarefas: [],
  anexos: [],
  descricao: "",
  depende_de_ids: [],
};

// Modal de criar/editar ação — mesmo padrão de acessibilidade e de painel
// rolável já usado em PreviewQuestionario.jsx (cabeçalho/rodapé fixos, só
// o corpo rola, evita o conteúdo "vazar" por cima/baixo durante o scroll).
export function AcaoFormModal({
  aberto,
  onFechar,
  onSalvar,
  onExcluir,
  acao,
  acoesDisponiveis,
  salvando,
  erro,
}) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [participanteInput, setParticipanteInput] = useState("");
  const painelRef = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    if (acao) {
      setForm({
        titulo: acao.titulo,
        tag: acao.tag ?? "",
        status: acao.status,
        prazo: acao.prazo ?? "",
        responsavel: acao.responsavel ?? "",
        participantes: acao.participantes ?? [],
        tarefas: (acao.tarefas ?? []).map((t) => ({ titulo: t.titulo, concluida: t.concluida })),
        anexos: acao.anexos ?? [],
        descricao: acao.descricao ?? "",
        depende_de_ids: (acao.depende_de ?? []).map((d) => d.id),
      });
    } else {
      setForm(FORM_VAZIO);
    }
    setParticipanteInput("");
    painelRef.current?.focus();

    function handleKeyDown(evento) {
      if (evento.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [aberto, acao, onFechar]);

  if (!aberto) return null;

  function adicionarParticipante() {
    const nome = participanteInput.trim();
    if (!nome) return;
    setForm((atual) => ({ ...atual, participantes: [...atual.participantes, nome] }));
    setParticipanteInput("");
  }

  function removerParticipante(indice) {
    setForm((atual) => ({
      ...atual,
      participantes: atual.participantes.filter((_, i) => i !== indice),
    }));
  }

  function adicionarTarefa() {
    setForm((atual) => ({
      ...atual,
      tarefas: [...atual.tarefas, { titulo: "", concluida: false }],
    }));
  }

  function atualizarTarefa(indice, alteracoes) {
    setForm((atual) => {
      const tarefas = [...atual.tarefas];
      tarefas[indice] = { ...tarefas[indice], ...alteracoes };
      return { ...atual, tarefas };
    });
  }

  function removerTarefa(indice) {
    setForm((atual) => ({ ...atual, tarefas: atual.tarefas.filter((_, i) => i !== indice) }));
  }

  function adicionarAnexo() {
    setForm((atual) => ({ ...atual, anexos: [...atual.anexos, { titulo: "", url: "" }] }));
  }

  function atualizarAnexo(indice, alteracoes) {
    setForm((atual) => {
      const anexos = [...atual.anexos];
      anexos[indice] = { ...anexos[indice], ...alteracoes };
      return { ...atual, anexos };
    });
  }

  function removerAnexo(indice) {
    setForm((atual) => ({ ...atual, anexos: atual.anexos.filter((_, i) => i !== indice) }));
  }

  function handleSubmit(evento) {
    evento.preventDefault();
    onSalvar({
      titulo: form.titulo,
      tag: form.tag || null,
      status: form.status,
      prazo: form.prazo || null,
      responsavel: form.responsavel || null,
      participantes: form.participantes,
      tarefas: form.tarefas.filter((t) => t.titulo.trim()),
      anexos: form.anexos.filter((a) => a.titulo.trim() && a.url.trim()),
      descricao: form.descricao || null,
      depende_de_ids: form.depende_de_ids,
    });
  }

  const outrasAcoes = (acoesDisponiveis ?? []).filter((a) => a.id !== acao?.id);

  return (
    <div
      className={styles.sobreposicao}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onFechar();
      }}
    >
      <div
        ref={painelRef}
        className={styles.painel}
        role="dialog"
        aria-modal="true"
        aria-label={acao ? `Editar ação: ${acao.titulo}` : "Nova ação"}
        tabIndex={-1}
      >
        <div className={styles.cabecalho}>
          <h2 className={styles.titulo}>{acao ? "Editar ação" : "Nova ação"}</h2>
          <button
            type="button"
            className={styles.botaoFechar}
            onClick={onFechar}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.formulario}>
          <div className={styles.corpo}>
            {erro && (
              <p role="alert" style={{ color: "var(--cor-perigo)" }}>
                {erro}
              </p>
            )}

            <div className={formStyles.campo}>
              <label htmlFor="acao-titulo" className={formStyles.rotulo}>
                Título
              </label>
              <input
                id="acao-titulo"
                className={formStyles.controle}
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                required
              />
            </div>

            <div className={styles.linhaCampos}>
              <div className={formStyles.campo}>
                <label htmlFor="acao-tag" className={formStyles.rotulo}>
                  Tag/dimensão
                </label>
                <input
                  id="acao-tag"
                  className={formStyles.controle}
                  value={form.tag}
                  onChange={(e) => setForm({ ...form, tag: e.target.value })}
                  placeholder="Ex.: Estresse"
                />
              </div>
              <div className={formStyles.campo}>
                <label htmlFor="acao-status" className={formStyles.rotulo}>
                  Status
                </label>
                <select
                  id="acao-status"
                  className={formStyles.controle}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {STATUS_ACAO.map((s) => (
                    <option key={s.valor} value={s.valor}>
                      {s.rotulo}
                    </option>
                  ))}
                </select>
              </div>
              <div className={formStyles.campo}>
                <label htmlFor="acao-prazo" className={formStyles.rotulo}>
                  Prazo
                </label>
                <input
                  id="acao-prazo"
                  type="date"
                  className={formStyles.controle}
                  value={form.prazo}
                  onChange={(e) => setForm({ ...form, prazo: e.target.value })}
                />
              </div>
            </div>

            <div className={formStyles.campo}>
              <label htmlFor="acao-responsavel" className={formStyles.rotulo}>
                Responsável
              </label>
              <input
                id="acao-responsavel"
                className={formStyles.controle}
                value={form.responsavel}
                onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                placeholder="Nome (texto livre — sem cadastro de pessoas no sistema)"
              />
            </div>

            <div className={formStyles.campo}>
              <label htmlFor="acao-participante-input" className={formStyles.rotulo}>
                Participantes
              </label>
              <div className={styles.linhaItemLista}>
                <input
                  id="acao-participante-input"
                  className={formStyles.controle}
                  value={participanteInput}
                  onChange={(e) => setParticipanteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      adicionarParticipante();
                    }
                  }}
                  placeholder="Nome e Enter para adicionar"
                />
                <Button type="button" variante="secundario" onClick={adicionarParticipante}>
                  Adicionar
                </Button>
              </div>
              {form.participantes.length > 0 && (
                <div className={styles.chips}>
                  {form.participantes.map((nome, indice) => (
                    <span key={`${nome}-${indice}`} className={styles.chip}>
                      {nome}
                      <button
                        type="button"
                        className={styles.chipRemover}
                        onClick={() => removerParticipante(indice)}
                        aria-label={`Remover ${nome}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className={formStyles.campo}>
              <label htmlFor="acao-descricao" className={formStyles.rotulo}>
                Descrição
              </label>
              <textarea
                id="acao-descricao"
                className={formStyles.controle}
                rows={3}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>

            <div className={styles.secaoLista}>
              <h3 className={styles.tituloSecaoLista}>Tarefas</h3>
              {form.tarefas.map((tarefa, indice) => (
                <div key={indice} className={styles.linhaItemLista}>
                  <input
                    type="checkbox"
                    checked={tarefa.concluida}
                    onChange={(e) => atualizarTarefa(indice, { concluida: e.target.checked })}
                    aria-label="Concluída"
                  />
                  <input
                    className={formStyles.controle}
                    value={tarefa.titulo}
                    onChange={(e) => atualizarTarefa(indice, { titulo: e.target.value })}
                    placeholder="Título da tarefa"
                  />
                  <button
                    type="button"
                    className={styles.botaoRemoverItem}
                    onClick={() => removerTarefa(indice)}
                    aria-label="Remover tarefa"
                  >
                    ×
                  </button>
                </div>
              ))}
              <Button type="button" variante="secundario" onClick={adicionarTarefa}>
                Adicionar tarefa
              </Button>
            </div>

            <div className={styles.secaoLista}>
              <h3 className={styles.tituloSecaoLista}>Anexos (links)</h3>
              {form.anexos.map((anexo, indice) => (
                <div key={indice} className={styles.linhaItemLista}>
                  <input
                    className={formStyles.controle}
                    value={anexo.titulo}
                    onChange={(e) => atualizarAnexo(indice, { titulo: e.target.value })}
                    placeholder="Título"
                  />
                  <input
                    className={formStyles.controle}
                    value={anexo.url}
                    onChange={(e) => atualizarAnexo(indice, { url: e.target.value })}
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    className={styles.botaoRemoverItem}
                    onClick={() => removerAnexo(indice)}
                    aria-label="Remover anexo"
                  >
                    ×
                  </button>
                </div>
              ))}
              <Button type="button" variante="secundario" onClick={adicionarAnexo}>
                Adicionar anexo
              </Button>
            </div>

            {outrasAcoes.length > 0 && (
              <div className={formStyles.campo}>
                <label htmlFor="acao-depende-de" className={formStyles.rotulo}>
                  Depende de (Ctrl/Cmd + clique para selecionar mais de uma)
                </label>
                <select
                  id="acao-depende-de"
                  className={formStyles.controle}
                  multiple
                  size={Math.min(6, Math.max(3, outrasAcoes.length))}
                  value={form.depende_de_ids}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      depende_de_ids: Array.from(e.target.selectedOptions, (o) => Number(o.value)),
                    })
                  }
                >
                  {outrasAcoes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.titulo}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className={styles.rodape}>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variante="secundario" onClick={onFechar}>
              Cancelar
            </Button>
            {acao && onExcluir && (
              <Button
                type="button"
                variante="perigo"
                style={{ marginLeft: "auto" }}
                onClick={() => onExcluir(acao)}
              >
                Excluir
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
