// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useState } from "react";

import * as adminApi from "../../api/admin";
import { Button } from "../../components/forms/Button";
import { ResultadosDashboard } from "../../components/resultados/ResultadosDashboard";
import formStyles from "../../components/forms/FormField.module.css";
import styles from "./ResultadosPage.module.css";

function idsSelecionados(evento) {
  return Array.from(evento.target.selectedOptions, (opcao) => Number(opcao.value));
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

  return (
    <section>
      <h1 className={styles.titulo}>Resultados</h1>
      {erro && (
        <p role="alert" style={{ color: "var(--cor-perigo)" }}>
          {erro}
        </p>
      )}

      <ResultadosDashboard resultados={resultados} carregando={carregandoResultados} />

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
