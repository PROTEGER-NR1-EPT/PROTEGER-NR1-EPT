// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import * as iaApi from "../../api/ia";
import { Button } from "../forms/Button";
import styles from "./AnaliseIaPainel.module.css";

const componentesMarkdown = {
  a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  table: (props) => (
    <div className={styles.tabelaMarkdown}>
      <table {...props} />
    </div>
  ),
};

// Aba "Análise IA" de ResultadosDashboard.jsx — reaproveitada entre
// Administrador e Consultor, já que o componente pai também é. Analisa
// exatamente o recorte de `resultados` já carregado/filtrado na tela
// (mesmos dados do radar/mapa de risco); nunca persiste nada — cada
// clique em "Analisar com IA" gera um texto novo.
export function AnaliseIaPainel({ resultados }) {
  const [analise, setAnalise] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const disponiveis = resultados.filter((r) => r.resultado_disponivel);

  async function handleGerar() {
    setGerando(true);
    setErro(null);
    try {
      const dados = await iaApi.gerarAnaliseResultados(resultados);
      setAnalise(dados.analise);
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    } finally {
      setGerando(false);
    }
  }

  async function handleCopiar() {
    try {
      await navigator.clipboard.writeText(analise);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Não foi possível copiar o texto.");
    }
  }

  if (disponiveis.length === 0) {
    return <p className={styles.mensagemVazia}>Nenhum resultado disponível para analisar ainda.</p>;
  }

  return (
    <div className={styles.painel}>
      {!analise && (
        <>
          <p className={styles.descricao}>
            A IA analisa os {disponiveis.length} resultado(s) atualmente exibidos (mesmo recorte de
            filtros desta tela) e escreve um resumo com pontos de atenção e sugestões — não
            substitui avaliação profissional.
          </p>
          <Button type="button" onClick={handleGerar} disabled={gerando}>
            {gerando ? "Analisando..." : "Analisar com IA"}
          </Button>
        </>
      )}

      {erro && (
        <p role="alert" className={styles.erro}>
          {erro}
        </p>
      )}

      {analise && (
        <>
          <div className={styles.textoAnalise}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={componentesMarkdown}>
              {analise}
            </ReactMarkdown>
          </div>
          <div className={styles.acoes}>
            <button type="button" className={styles.botaoTexto} onClick={handleCopiar}>
              {copiado ? "Copiado" : "Copiar"}
            </button>
            <button type="button" className={styles.botaoTexto} onClick={handleGerar} disabled={gerando}>
              {gerando ? "Gerando..." : "Gerar novamente"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
