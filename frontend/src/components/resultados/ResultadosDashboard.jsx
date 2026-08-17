import { useMemo, useState } from "react";

import { classificarNivelRisco } from "../../utils/risco";
import { MapaRiscoHeatmap } from "./MapaRiscoHeatmap";
import { RadarDimensoes } from "./RadarDimensoes";
import styles from "./ResultadosDashboard.module.css";

const ABAS = [
  { valor: "visao-geral", rotulo: "Visão geral" },
  { valor: "mapa-risco", rotulo: "Mapa de risco" },
];

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

// Cards de KPI + abas Visão geral (radar)/Mapa de risco — extraído de
// pages/admin/ResultadosPage.jsx para ser reaproveitado também pelo
// Consultor (pages/consultor/ResultadosInstituicao.jsx), que não tem os
// filtros multi-instituição do Administrador: só passa a lista de
// `resultados` (mesmo formato de GET /admin/resultados — com
// `risco`/`nivel_risco` — já escopada do lado do backend).
export function ResultadosDashboard({ resultados, carregando }) {
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");

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
    <>
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
          {carregando ? (
            <p>Carregando resultados...</p>
          ) : abaAtiva === "visao-geral" ? (
            <RadarDimensoes dados={dadosRadar} />
          ) : (
            <MapaRiscoHeatmap resultados={resultados} />
          )}
        </div>
      </div>
    </>
  );
}
