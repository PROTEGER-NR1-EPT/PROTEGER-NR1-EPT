// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useState } from "react";

import * as adminApi from "../../api/admin";
import * as planosAcaoApi from "../../api/planosAcao";
import { AcaoFormModal } from "../../components/planos-acao/AcaoFormModal";
import { CalendarioAcoes } from "../../components/planos-acao/CalendarioAcoes";
import { KanbanAcoes } from "../../components/planos-acao/KanbanAcoes";
import { TabelaAcoes } from "../../components/planos-acao/TabelaAcoes";
import { BotaoIcone } from "../../components/common/BotaoIcone";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { PageHeader } from "../../components/common/PageHeader";
import { IconeEditar, IconeExcluir } from "../../components/common/icones";
import { Button } from "../../components/forms/Button";
import { DropdownInstituicao } from "../../components/forms/DropdownInstituicao";
import formStyles from "../../components/forms/FormField.module.css";
import styles from "./PlanosAcaoPage.module.css";

const ABAS = [
  { valor: "kanban", rotulo: "Kanban" },
  { valor: "tabela", rotulo: "Tabela" },
  { valor: "calendario", rotulo: "Calendário" },
];

export function PlanosAcaoPage() {
  const [instituicaoId, setInstituicaoId] = useState(null);
  const [planos, setPlanos] = useState([]);
  const [planoSelecionadoId, setPlanoSelecionadoId] = useState(null);
  const [novoCiclo, setNovoCiclo] = useState("");
  const [criandoCiclo, setCriandoCiclo] = useState(false);

  const [editandoCiclo, setEditandoCiclo] = useState(false);
  const [cicloEditado, setCicloEditado] = useState("");
  const [salvandoCiclo, setSalvandoCiclo] = useState(false);

  const [confirmarExclusaoPlano, setConfirmarExclusaoPlano] = useState(null);
  const [excluindoPlano, setExcluindoPlano] = useState(false);
  const [erroModalExclusaoPlano, setErroModalExclusaoPlano] = useState(null);

  const [acoes, setAcoes] = useState([]);
  const [carregandoAcoes, setCarregandoAcoes] = useState(false);
  const [erro, setErro] = useState(null);
  const [gerandoSugestoes, setGerandoSugestoes] = useState(false);

  const [visualizacao, setVisualizacao] = useState("kanban");

  const [modalAberto, setModalAberto] = useState(false);
  const [acaoEditando, setAcaoEditando] = useState(null);
  const [salvandoAcao, setSalvandoAcao] = useState(false);
  const [erroModalAcao, setErroModalAcao] = useState(null);

  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroModalExclusao, setErroModalExclusao] = useState(null);

  useEffect(() => {
    setEditandoCiclo(false);
    if (!instituicaoId) {
      setPlanos([]);
      setPlanoSelecionadoId(null);
      return;
    }
    let cancelado = false;
    planosAcaoApi
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
    carregarAcoes(planoSelecionadoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planoSelecionadoId]);

  async function carregarAcoes(planoId) {
    setCarregandoAcoes(true);
    setErro(null);
    try {
      setAcoes(await planosAcaoApi.listarAcoes(planoId));
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    } finally {
      setCarregandoAcoes(false);
    }
  }

  async function handleCriarCiclo(evento) {
    evento.preventDefault();
    if (!novoCiclo.trim() || !instituicaoId) return;
    setCriandoCiclo(true);
    setErro(null);
    try {
      const plano = await planosAcaoApi.criarPlano(instituicaoId, novoCiclo.trim());
      setPlanos((atual) => [plano, ...atual]);
      setPlanoSelecionadoId(plano.id);
      setNovoCiclo("");
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    } finally {
      setCriandoCiclo(false);
    }
  }

  function handleIniciarEdicaoCiclo() {
    setCicloEditado(planoSelecionado.ciclo);
    setErro(null);
    setEditandoCiclo(true);
  }

  async function handleSalvarCiclo(evento) {
    evento.preventDefault();
    if (!cicloEditado.trim()) return;
    setSalvandoCiclo(true);
    setErro(null);
    try {
      const cicloSalvo = cicloEditado.trim();
      await planosAcaoApi.editarPlano(planoSelecionadoId, cicloSalvo);
      setPlanos((atual) =>
        atual.map((p) => (p.id === planoSelecionadoId ? { ...p, ciclo: cicloSalvo } : p))
      );
      setEditandoCiclo(false);
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    } finally {
      setSalvandoCiclo(false);
    }
  }

  async function handleConfirmarExclusaoPlano() {
    setExcluindoPlano(true);
    setErroModalExclusaoPlano(null);
    try {
      await planosAcaoApi.excluirPlano(confirmarExclusaoPlano.id);
      const restantes = planos.filter((p) => p.id !== confirmarExclusaoPlano.id);
      setPlanos(restantes);
      setPlanoSelecionadoId(restantes.length > 0 ? restantes[0].id : null);
      setConfirmarExclusaoPlano(null);
    } catch (erroApi) {
      setErroModalExclusaoPlano(erroApi.mensagem);
    } finally {
      setExcluindoPlano(false);
    }
  }

  function handleNovaAcao() {
    setAcaoEditando(null);
    setErroModalAcao(null);
    setModalAberto(true);
  }

  function handleEditarAcao(acao) {
    setAcaoEditando(acao);
    setErroModalAcao(null);
    setModalAberto(true);
  }

  async function handleSalvarAcao(dados) {
    setSalvandoAcao(true);
    setErroModalAcao(null);
    try {
      if (acaoEditando) {
        await planosAcaoApi.editarAcao(acaoEditando.id, dados);
      } else {
        await planosAcaoApi.criarAcao(planoSelecionadoId, dados);
      }
      setModalAberto(false);
      await carregarAcoes(planoSelecionadoId);
    } catch (erroApi) {
      setErroModalAcao(erroApi.mensagem);
    } finally {
      setSalvandoAcao(false);
    }
  }

  async function handleMoverStatus(acaoId, novoStatus) {
    const acao = acoes.find((a) => a.id === acaoId);
    if (!acao || acao.status === novoStatus) return;
    const novaOrdem = acoes.filter((a) => a.status === novoStatus).length;
    setAcoes((atual) =>
      atual.map((a) => (a.id === acaoId ? { ...a, status: novoStatus, ordem: novaOrdem } : a))
    );
    try {
      await planosAcaoApi.editarAcao(acaoId, { status: novoStatus, ordem: novaOrdem });
    } catch (erroApi) {
      setErro(erroApi.mensagem);
      carregarAcoes(planoSelecionadoId);
    }
  }

  function handlePedirExclusao(acao) {
    setErroModalExclusao(null);
    setConfirmarExclusao(acao);
  }

  function handlePedirExclusaoDoModal(acao) {
    setModalAberto(false);
    handlePedirExclusao(acao);
  }

  async function handleConfirmarExclusao() {
    setExcluindo(true);
    setErroModalExclusao(null);
    try {
      await planosAcaoApi.excluirAcao(confirmarExclusao.id);
      setConfirmarExclusao(null);
      await carregarAcoes(planoSelecionadoId);
    } catch (erroApi) {
      setErroModalExclusao(erroApi.mensagem);
    } finally {
      setExcluindo(false);
    }
  }

  async function handleGerarSugestoes() {
    setGerandoSugestoes(true);
    setErro(null);
    try {
      await planosAcaoApi.gerarSugestoes(planoSelecionadoId);
      await carregarAcoes(planoSelecionadoId);
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    } finally {
      setGerandoSugestoes(false);
    }
  }

  const planoSelecionado = planos.find((p) => p.id === planoSelecionadoId) ?? null;
  const totalAcoes = acoes.length;
  const pendentes = acoes.filter((a) => a.status === "pendente").length;
  const emAndamento = acoes.filter((a) => a.status === "em_andamento").length;
  const concluidas = acoes.filter((a) => a.status === "concluido").length;

  return (
    <section>
      <PageHeader titulo="Planos de ação">
        <p>
          Um Plano de ação organiza as ações que a instituição vai tomar
          pra tratar os riscos psicossociais identificados no diagnóstico,
          agrupadas por ciclo (ex.: um semestre).
        </p>
        <h3>Escolher instituição e ciclo</h3>
        <ul>
          <li>
            Selecione a instituição no topo; depois escolha um ciclo já
            existente no dropdown, ou crie um novo em "Novo ciclo".
          </li>
          <li>
            O lápis ao lado do ciclo renomeia; a lixeira exclui o ciclo
            inteiro (ações, tarefas e dependências) — não pode ser desfeito.
          </li>
        </ul>
        <h3>As três visualizações</h3>
        <ul>
          <li>
            <strong>Kanban</strong>: arraste as ações entre as colunas de
            status (pendente/em andamento/concluído).
          </li>
          <li>
            <strong>Tabela</strong>: lista todas as ações com filtros e
            ordenação, boa pra revisar tudo de uma vez.
          </li>
          <li>
            <strong>Calendário</strong>: mostra as ações no mês do prazo —
            clique num item pra abrir os detalhes.
          </li>
        </ul>
        <h3>Ações</h3>
        <ul>
          <li>
            "Nova ação" abre o formulário de cadastro (título, prazo,
            responsável, tarefas, dependências de outras ações).
          </li>
          <li>
            "Gerar sugestões a partir do diagnóstico" usa a IA (se
            habilitada) pra propor ações com base nos resultados do
            questionário — sempre revise antes de manter.
          </li>
        </ul>
      </PageHeader>
      {erro && (
        <p role="alert" style={{ color: "var(--cor-perigo)" }}>
          {erro}
        </p>
      )}

      <div className={styles.secaoSeletor}>
        <DropdownInstituicao
          value={instituicaoId}
          onChange={(instituicao) => setInstituicaoId(instituicao?.id ?? null)}
          carregarInstituicoes={adminApi.listarInstituicoes}
        />

        {instituicaoId && (
          <div className={styles.linhaCiclo}>
            {editandoCiclo ? (
              <form className={styles.formNovoCiclo} onSubmit={handleSalvarCiclo}>
                <div className={formStyles.campo} style={{ marginBottom: 0, flex: "1 1 16rem" }}>
                  <label htmlFor="ciclo-editado" className={formStyles.rotulo}>
                    Renomear ciclo
                  </label>
                  <input
                    id="ciclo-editado"
                    className={formStyles.controle}
                    value={cicloEditado}
                    onChange={(e) => setCicloEditado(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={salvandoCiclo || !cicloEditado.trim()}>
                  {salvandoCiclo ? "Salvando..." : "Salvar"}
                </Button>
                <Button
                  type="button"
                  variante="secundario"
                  onClick={() => setEditandoCiclo(false)}
                  disabled={salvandoCiclo}
                >
                  Cancelar
                </Button>
              </form>
            ) : (
              <div className={formStyles.campo} style={{ marginBottom: 0, flex: "1 1 16rem" }}>
                <label htmlFor="plano-ciclo" className={formStyles.rotulo}>
                  Ciclo
                </label>
                <div className={styles.linhaSelectCiclo}>
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
                  {planoSelecionado && (
                    <>
                      <BotaoIcone
                        icone={IconeEditar}
                        rotulo={`Renomear ciclo ${planoSelecionado.ciclo}`}
                        onClick={handleIniciarEdicaoCiclo}
                      />
                      <BotaoIcone
                        icone={IconeExcluir}
                        rotulo={`Excluir ciclo ${planoSelecionado.ciclo}`}
                        onClick={() => {
                          setErroModalExclusaoPlano(null);
                          setConfirmarExclusaoPlano(planoSelecionado);
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            <form className={styles.formNovoCiclo} onSubmit={handleCriarCiclo}>
              <div className={formStyles.campo} style={{ marginBottom: 0 }}>
                <label htmlFor="novo-ciclo" className={formStyles.rotulo}>
                  Novo ciclo
                </label>
                <input
                  id="novo-ciclo"
                  className={formStyles.controle}
                  value={novoCiclo}
                  onChange={(e) => setNovoCiclo(e.target.value)}
                  placeholder="Ex.: Mar/2026"
                />
              </div>
              <Button type="submit" variante="secundario" disabled={criandoCiclo || !novoCiclo.trim()}>
                {criandoCiclo ? "Criando..." : "Novo ciclo"}
              </Button>
            </form>
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

          <div className={styles.acoesTopo}>
            <Button onClick={handleNovaAcao}>Nova ação</Button>
            <Button variante="secundario" onClick={handleGerarSugestoes} disabled={gerandoSugestoes}>
              {gerandoSugestoes ? "Gerando..." : "Gerar sugestões a partir do diagnóstico"}
            </Button>
          </div>

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
            <KanbanAcoes acoes={acoes} onEditar={handleEditarAcao} onMoverStatus={handleMoverStatus} />
          ) : visualizacao === "tabela" ? (
            <TabelaAcoes acoes={acoes} onEditar={handleEditarAcao} onExcluir={handlePedirExclusao} />
          ) : (
            <CalendarioAcoes acoes={acoes} onEditar={handleEditarAcao} />
          )}
        </>
      )}

      {instituicaoId && !planoSelecionado && (
        <p className={styles.subtituloPlano}>Crie um ciclo para começar a cadastrar ações.</p>
      )}

      <AcaoFormModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSalvar={handleSalvarAcao}
        onExcluir={handlePedirExclusaoDoModal}
        acao={acaoEditando}
        acoesDisponiveis={acoes}
        salvando={salvandoAcao}
        erro={erroModalAcao}
      />

      <ConfirmModal
        aberto={confirmarExclusao !== null}
        titulo={`Excluir "${confirmarExclusao?.titulo ?? ""}"?`}
        perigo
        confirmando={excluindo}
        textoConfirmar="Excluir"
        onCancelar={() => {
          setConfirmarExclusao(null);
          setErroModalExclusao(null);
        }}
        onConfirmar={handleConfirmarExclusao}
      >
        <p>
          A ação, suas tarefas e as dependências ligadas a ela são removidas
          permanentemente — isso não pode ser desfeito.
        </p>
        {erroModalExclusao && (
          <p role="alert" style={{ color: "var(--cor-perigo)" }}>
            {erroModalExclusao}
          </p>
        )}
      </ConfirmModal>

      <ConfirmModal
        aberto={confirmarExclusaoPlano !== null}
        titulo={`Excluir o ciclo "${confirmarExclusaoPlano?.ciclo ?? ""}"?`}
        perigo
        confirmando={excluindoPlano}
        textoConfirmar="Excluir"
        onCancelar={() => {
          setConfirmarExclusaoPlano(null);
          setErroModalExclusaoPlano(null);
        }}
        onConfirmar={handleConfirmarExclusaoPlano}
      >
        <p>
          O ciclo e todas as suas ações, tarefas e dependências são removidos
          permanentemente — isso não pode ser desfeito.
        </p>
        {erroModalExclusaoPlano && (
          <p role="alert" style={{ color: "var(--cor-perigo)" }}>
            {erroModalExclusaoPlano}
          </p>
        )}
      </ConfirmModal>
    </section>
  );
}
