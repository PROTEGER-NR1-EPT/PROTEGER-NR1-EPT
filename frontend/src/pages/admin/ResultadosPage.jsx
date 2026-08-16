import { useEffect, useMemo, useState } from "react";

import * as adminApi from "../../api/admin";
import { Button } from "../../components/forms/Button";
import { MapaRiscoHeatmap } from "../../components/resultados/MapaRiscoHeatmap";
import { RadarDimensoes } from "../../components/resultados/RadarDimensoes";
import { classificarNivelRisco } from "../../utils/risco";
import formStyles from "../../components/forms/FormField.module.css";
import styles from "./ResultadosPage.module.css";

const ABAS = [
  { valor: "visao-geral", rotulo: "Visão geral" },
  { valor: "mapa-risco", rotulo: "Mapa de risco" },
];

function idsSelecionados(evento) {
  return Array.from(evento.target.selectedOptions, (opcao) => Number(opcao.value));
}

function IconeGrupos({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path d="M4 8l8-4 8 4-8 4-8-4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 12l8 4 8-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 16l8 4 8-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconeRespostas({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 12l3 3 5-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeRisco({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path d="M12 3l10 18H2L12 3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 10v4M12 17h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconeIndisponivel({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ResultadosPage() {
  const [instituicoes, setInstituicoes] = useState([]);
  const [setores, setSetores] = useState([]);
  const [questionarios, setQuestionarios] = useState([]);
  const [carregandoOpcoes, setCarregandoOpcoes] = useState(true);

  const [filtroInstituicaoIds, setFiltroInstituicaoIds] = useState([]);
  const [filtroSetorIds, setFiltroSetorIds] = useState([]);
  const [filtroQuestionarioIds, setFiltroQuestionarioIds] = useState([]);
  const [filtroInstrumento, setFiltroInstrumento] = useState("");

  const [resultados, setResultados] = useState([]);
  const [carregandoResultados, setCarregandoResultados] = useState(true);
  const [erro, setErro] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");

  async function carregarResultados(filtros) {
    setCarregandoResultados(true);
    setErro(null);
    try {
      setResultados(await adminApi.obterResultadosDashboard(filtros));
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    } finally {
      setCarregandoResultados(false);
    }
  }

  useEffect(() => {
    async function carregarOpcoes() {
      setCarregandoOpcoes(true);
      try {
        const [listaInstituicoes, listaSetores, listaQuestionarios] = await Promise.all([
          adminApi.listarInstituicoes(),
          adminApi.listarSetores(),
          adminApi.listarQuestionarios(),
        ]);
        setInstituicoes(listaInstituicoes);
        setSetores(listaSetores);
        setQuestionarios(listaQuestionarios);
      } catch (erroApi) {
        setErro(erroApi.mensagem);
      } finally {
        setCarregandoOpcoes(false);
      }
    }
    carregarOpcoes();
    carregarResultados({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setoresDisponiveis =
    filtroInstituicaoIds.length === 0
      ? setores
      : setores.filter((setor) => filtroInstituicaoIds.includes(setor.instituicao_id));

  const totalFiltrosAtivos =
    filtroInstituicaoIds.length +
    filtroSetorIds.length +
    filtroQuestionarioIds.length +
    (filtroInstrumento ? 1 : 0);

  function handleAplicarFiltros(evento) {
    evento.preventDefault();
    carregarResultados({
      instituicaoIds: filtroInstituicaoIds,
      setorIds: filtroSetorIds,
      questionarioIds: filtroQuestionarioIds,
      instrumento: filtroInstrumento,
    });
  }

  function handleLimparFiltros() {
    setFiltroInstituicaoIds([]);
    setFiltroSetorIds([]);
    setFiltroQuestionarioIds([]);
    setFiltroInstrumento("");
    carregarResultados({});
  }

  const disponiveis = useMemo(
    () => resultados.filter((r) => r.resultado_disponivel),
    [resultados]
  );

  const kpis = useMemo(() => {
    const grupos = new Map();
    disponiveis.forEach((r) => {
      grupos.set(`${r.instituicao_id}-${r.setor_id}-${r.questionario_id}`, r.n_respostas);
    });
    const respostasSomadas = [...grupos.values()].reduce((soma, n) => soma + n, 0);
    const emRisco = disponiveis.filter(
      (r) => r.nivel_risco === "alto" || r.nivel_risco === "critico"
    ).length;
    const percentualEmRisco =
      disponiveis.length > 0 ? Math.round((emRisco / disponiveis.length) * 100) : 0;
    const indisponiveis = resultados.length - disponiveis.length;

    return {
      totalGrupos: grupos.size,
      respostasSomadas,
      dimensoesEmRisco: emRisco,
      percentualEmRisco,
      indisponiveis,
    };
  }, [resultados, disponiveis]);

  const dadosRadar = useMemo(() => {
    const porDimensao = new Map();
    disponiveis.forEach((r) => {
      if (!porDimensao.has(r.dominio_nome)) porDimensao.set(r.dominio_nome, []);
      porDimensao.get(r.dominio_nome).push(r.risco);
    });
    return [...porDimensao.entries()].map(([dimensao, riscos]) => {
      const media = riscos.reduce((soma, valor) => soma + valor, 0) / riscos.length;
      const arredondado = Math.round(media * 10) / 10;
      return { dimensao, risco: arredondado, nivel_risco: classificarNivelRisco(arredondado) };
    });
  }, [disponiveis]);

  return (
    <section>
      <h1 className={styles.titulo}>Resultados</h1>
      {erro && (
        <p role="alert" style={{ color: "var(--cor-perigo)" }}>
          {erro}
        </p>
      )}

      <div className={styles.grade}>
        <div className={styles.cartao} style={{ "--cor-acento": "var(--cor-primaria)" }}>
          <IconeGrupos className={styles.iconeCartao} />
          <h2 className={styles.tituloCartao}>Grupos avaliados</h2>
          <p className={styles.numeroPrincipal}>{kpis.totalGrupos}</p>
          <p className={styles.detalheCartao}>instituição + setor + questionário</p>
        </div>
        <div className={styles.cartao} style={{ "--cor-acento": "var(--cor-sucesso)" }}>
          <IconeRespostas className={styles.iconeCartao} />
          <h2 className={styles.tituloCartao}>Respostas somadas</h2>
          <p className={styles.numeroPrincipal}>{kpis.respostasSomadas}</p>
          <p className={styles.detalheCartao}>só grupos acima do limiar de k-anonimato</p>
        </div>
        <div className={styles.cartao} style={{ "--cor-acento": "var(--cor-perigo)" }}>
          <IconeRisco className={styles.iconeCartao} />
          <h2 className={styles.tituloCartao}>Dimensões em risco alto/crítico</h2>
          <p className={styles.numeroPrincipal}>{kpis.dimensoesEmRisco}</p>
          <p className={styles.detalheCartao}>{kpis.percentualEmRisco}% do total avaliado</p>
        </div>
        <div className={styles.cartao} style={{ "--cor-acento": "var(--cor-texto-secundario)" }}>
          <IconeIndisponivel className={styles.iconeCartao} />
          <h2 className={styles.tituloCartao}>Dimensões indisponíveis</h2>
          <p className={styles.numeroPrincipal}>{kpis.indisponiveis}</p>
          <p className={styles.detalheCartao}>abaixo do limiar de k-anonimato</p>
        </div>
      </div>

      <div className={styles.painel}>
        <div className={styles.abas} role="tablist" aria-label="Visualização de resultados">
          {ABAS.map((aba) => (
            <button
              key={aba.valor}
              type="button"
              role="tab"
              aria-selected={abaAtiva === aba.valor}
              className={`${styles.aba} ${abaAtiva === aba.valor ? styles.abaAtiva : ""}`}
              onClick={() => setAbaAtiva(aba.valor)}
            >
              {aba.rotulo}
            </button>
          ))}
        </div>

        <div className={styles.painelAba}>
          {carregandoResultados ? (
            <p>Carregando resultados...</p>
          ) : abaAtiva === "visao-geral" ? (
            <RadarDimensoes dados={dadosRadar} />
          ) : (
            <MapaRiscoHeatmap resultados={resultados} />
          )}
        </div>
      </div>

      <div className={styles.secaoFiltros}>
        <div className={styles.cabecalhoFiltros}>
          <h2 className={styles.tituloFiltros}>Filtros</h2>
          {totalFiltrosAtivos > 0 && (
            <span className={styles.contadorFiltros}>{totalFiltrosAtivos} ativo(s)</span>
          )}
        </div>
        <form onSubmit={handleAplicarFiltros}>
          <div className={styles.linhaFiltros}>
            <div className={formStyles.campo}>
              <label htmlFor="filtro-instituicoes" className={formStyles.rotulo}>
                Instituição(ões)
              </label>
              <select
                id="filtro-instituicoes"
                className={formStyles.controle}
                multiple
                size={Math.min(6, Math.max(3, instituicoes.length))}
                value={filtroInstituicaoIds}
                onChange={(e) => {
                  const ids = idsSelecionados(e);
                  setFiltroInstituicaoIds(ids);
                  setFiltroSetorIds((atual) =>
                    atual.filter((setorId) => {
                      const setor = setores.find((s) => s.id === setorId);
                      return !setor || ids.length === 0 || ids.includes(setor.instituicao_id);
                    })
                  );
                }}
                disabled={carregandoOpcoes}
              >
                {instituicoes.map((instituicao) => (
                  <option key={instituicao.id} value={instituicao.id}>
                    {instituicao.nome}
                  </option>
                ))}
              </select>
              <span className={formStyles.textoAjuda}>Nenhuma selecionada = todas.</span>
            </div>

            <div className={formStyles.campo}>
              <label htmlFor="filtro-setores" className={formStyles.rotulo}>
                Setor(es)
              </label>
              <select
                id="filtro-setores"
                className={formStyles.controle}
                multiple
                size={Math.min(6, Math.max(3, setoresDisponiveis.length))}
                value={filtroSetorIds}
                onChange={(e) => setFiltroSetorIds(idsSelecionados(e))}
                disabled={carregandoOpcoes}
              >
                {setoresDisponiveis.map((setor) => (
                  <option key={setor.id} value={setor.id}>
                    {setor.nome}
                  </option>
                ))}
              </select>
              <span className={formStyles.textoAjuda}>Nenhum selecionado = todos.</span>
            </div>

            <div className={formStyles.campo}>
              <label htmlFor="filtro-questionarios" className={formStyles.rotulo}>
                Questionário(s)
              </label>
              <select
                id="filtro-questionarios"
                className={formStyles.controle}
                multiple
                size={Math.min(6, Math.max(3, questionarios.length))}
                value={filtroQuestionarioIds}
                onChange={(e) => setFiltroQuestionarioIds(idsSelecionados(e))}
                disabled={carregandoOpcoes}
              >
                {questionarios.map((questionario) => (
                  <option key={questionario.id} value={questionario.id}>
                    {questionario.titulo}
                    {!questionario.ativo ? " (inativo)" : ""}
                  </option>
                ))}
              </select>
              <span className={formStyles.textoAjuda}>Nenhum selecionado = todos.</span>
            </div>

            <div className={formStyles.campo}>
              <label htmlFor="filtro-instrumento" className={formStyles.rotulo}>
                Instrumento
              </label>
              <select
                id="filtro-instrumento"
                className={formStyles.controle}
                value={filtroInstrumento}
                onChange={(e) => setFiltroInstrumento(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="karasek">Karasek (puro)</option>
                <option value="copsoq">COPSOQ (puro)</option>
                <option value="misto">Misto</option>
              </select>
            </div>
          </div>

          <div className={styles.acoesFiltros}>
            <Button type="submit" disabled={carregandoResultados}>
              {carregandoResultados ? "Aplicando..." : "Aplicar filtros"}
            </Button>
            <Button type="button" variante="secundario" onClick={handleLimparFiltros}>
              Limpar filtros
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
