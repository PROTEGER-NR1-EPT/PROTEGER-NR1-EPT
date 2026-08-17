import { useEffect, useState } from "react";

import * as consultorApi from "../../api/consultor";
import { CalendarioAcoes } from "../../components/planos-acao/CalendarioAcoes";
import { DetalhesAcaoModal } from "../../components/planos-acao/DetalhesAcaoModal";
import { KanbanAcoes } from "../../components/planos-acao/KanbanAcoes";
import { TabelaAcoes } from "../../components/planos-acao/TabelaAcoes";
import { DropdownInstituicao } from "../../components/forms/DropdownInstituicao";
import formStyles from "../../components/forms/FormField.module.css";
import styles from "./PlanosAcaoConsultor.module.css";

const ABAS = [
  { valor: "kanban", rotulo: "Kanban" },
  { valor: "tabela", rotulo: "Tabela" },
  { valor: "calendario", rotulo: "Calendário" },
];

// Versão somente leitura de Planos de Ação para o Consultor — mesma UI de
// visualização de pages/admin/PlanosAcaoPage.jsx (Kanban/Tabela/Calendário),
// mas sem nenhuma ação de escrita (sem criar ciclo/ação, sem editar,
// excluir, mover status ou gerar sugestões — isso continua exclusivo do
// Administrador). Página própria em vez de reaproveitar PlanosAcaoPage.jsx
// para não precisar espalhar `somenteLeitura` por um componente pensado
// para edição completa.
export function PlanosAcaoConsultor() {
  const [instituicaoId, setInstituicaoId] = useState(null);
  const [planos, setPlanos] = useState([]);
  const [planoSelecionadoId, setPlanoSelecionadoId] = useState(null);

  const [acoes, setAcoes] = useState([]);
  const [carregandoAcoes, setCarregandoAcoes] = useState(false);
  const [erro, setErro] = useState(null);

  const [visualizacao, setVisualizacao] = useState("kanban");
  const [acaoSelecionada, setAcaoSelecionada] = useState(null);

  useEffect(() => {
    if (!instituicaoId) {
      setPlanos([]);
      setPlanoSelecionadoId(null);
      return;
    }
    let cancelado = false;
    consultorApi
      .listarPlanos(instituicaoId)
      .then((lista) => {
        if (cancelado) return;
        setPlanos(lista);
        setPlanoSelecionadoId(lista.length > 0 ? lista[0].id : null);
      })
      .catch((erroApi) => {
        if (!cancelado) setErro(erroApi.mensagem);
      });
    return () => {
      cancelado = true;
    };
  }, [instituicaoId]);

  useEffect(() => {
    if (!planoSelecionadoId) {
      setAcoes([]);
      return;
    }
    let cancelado = false;
    setCarregandoAcoes(true);
    setErro(null);
    consultorApi
      .listarAcoes(planoSelecionadoId)
      .then((lista) => {
        if (!cancelado) setAcoes(lista);
      })
      .catch((erroApi) => {
        if (!cancelado) setErro(erroApi.mensagem);
      })
      .finally(() => {
        if (!cancelado) setCarregandoAcoes(false);
      });
    return () => {
      cancelado = true;
    };
  }, [planoSelecionadoId]);

  const planoSelecionado = planos.find((p) => p.id === planoSelecionadoId) ?? null;
  const totalAcoes = acoes.length;
  const pendentes = acoes.filter((a) => a.status === "pendente").length;
  const emAndamento = acoes.filter((a) => a.status === "em_andamento").length;
  const concluidas = acoes.filter((a) => a.status === "concluido").length;

  return (
    <section>
      <h1>Planos de ação</h1>
      {erro && (
        <p role="alert" style={{ color: "var(--cor-perigo)" }}>
          {erro}
        </p>
      )}

      <div className={styles.secaoSeletor}>
        <DropdownInstituicao
          value={instituicaoId}
          onChange={(instituicao) => setInstituicaoId(instituicao?.id ?? null)}
          carregarInstituicoes={consultorApi.listarMinhasInstituicoes}
        />

        {instituicaoId && (
          <div className={formStyles.campo} style={{ marginBottom: 0, marginTop: "var(--espaco-3)" }}>
            <label htmlFor="plano-ciclo" className={formStyles.rotulo}>
              Ciclo
            </label>
            <select
              id="plano-ciclo"
              className={formStyles.controle}
              value={planoSelecionadoId ?? ""}
              onChange={(e) => setPlanoSelecionadoId(Number(e.target.value) || null)}
              disabled={planos.length === 0}
            >
              {planos.length === 0 && <option value="">Nenhum ciclo cadastrado</option>}
              {planos.map((plano) => (
                <option key={plano.id} value={plano.id}>
                  {plano.ciclo}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {planoSelecionado && (
        <>
          <div className={styles.cabecalhoPlano}>
            <div>
              <h2 className={styles.tituloPlano}>Ciclo {planoSelecionado.ciclo}</h2>
              <p className={styles.subtituloPlano}>{totalAcoes} ação(ões)</p>
            </div>
            {totalAcoes > 0 && (
              <span className={styles.badgeConcluidas}>
                {concluidas}/{totalAcoes} concluídas
              </span>
            )}
          </div>

          {totalAcoes > 0 && (
            <div className={styles.barraProgresso}>
              {pendentes > 0 && (
                <div
                  className={styles.segmentoPendente}
                  style={{ width: `${(pendentes / totalAcoes) * 100}%` }}
                />
              )}
              {emAndamento > 0 && (
                <div
                  className={styles.segmentoAndamento}
                  style={{ width: `${(emAndamento / totalAcoes) * 100}%` }}
                />
              )}
              {concluidas > 0 && (
                <div
                  className={styles.segmentoConcluido}
                  style={{ width: `${(concluidas / totalAcoes) * 100}%` }}
                />
              )}
            </div>
          )}

          <div className={styles.abas} role="tablist" aria-label="Visualização do plano de ação">
            {ABAS.map((aba) => (
              <button
                key={aba.valor}
                type="button"
                role="tab"
                aria-selected={visualizacao === aba.valor}
                className={`${styles.aba} ${visualizacao === aba.valor ? styles.abaAtiva : ""}`}
                onClick={() => setVisualizacao(aba.valor)}
              >
                {aba.rotulo}
              </button>
            ))}
          </div>

          {carregandoAcoes ? (
            <p>Carregando ações...</p>
          ) : visualizacao === "kanban" ? (
            <KanbanAcoes acoes={acoes} onEditar={setAcaoSelecionada} somenteLeitura />
          ) : visualizacao === "tabela" ? (
            <TabelaAcoes acoes={acoes} onEditar={setAcaoSelecionada} somenteLeitura />
          ) : (
            <CalendarioAcoes acoes={acoes} onEditar={setAcaoSelecionada} />
          )}
        </>
      )}

      {instituicaoId && !planoSelecionado && (
        <p className={styles.subtituloPlano}>Nenhum ciclo cadastrado para esta instituição ainda.</p>
      )}

      <DetalhesAcaoModal
        aberto={acaoSelecionada !== null}
        onFechar={() => setAcaoSelecionada(null)}
        acao={acaoSelecionada}
      />
    </section>
  );
}
