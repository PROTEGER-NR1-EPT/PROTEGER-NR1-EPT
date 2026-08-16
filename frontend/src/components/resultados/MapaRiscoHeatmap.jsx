import { useMemo } from "react";

import { classificarNivelRisco, ROTULO_NIVEL_RISCO } from "../../utils/risco";
import styles from "./MapaRiscoHeatmap.module.css";

const CLASSE_POR_NIVEL = {
  baixo: "nivelBaixo",
  moderado: "nivelModerado",
  alto: "nivelAlto",
  critico: "nivelCritico",
};

export function MapaRiscoHeatmap({ resultados }) {
  const { linhas, colunas, celulas } = useMemo(() => {
    const disponiveis = resultados.filter((r) => r.resultado_disponivel);
    const instituicoesDistintas = new Set(disponiveis.map((r) => r.instituicao_id));
    const rotuloLinha = (r) =>
      instituicoesDistintas.size > 1 ? `${r.instituicao_nome} · ${r.setor_nome}` : r.setor_nome;

    const linhasMapa = new Map();
    const colunasSet = new Set();
    const grupos = new Map();

    disponiveis.forEach((r) => {
      const chaveLinha = `${r.instituicao_id}-${r.setor_id}`;
      linhasMapa.set(chaveLinha, rotuloLinha(r));
      colunasSet.add(r.dominio_nome);
      const chaveCelula = `${chaveLinha}|${r.dominio_nome}`;
      if (!grupos.has(chaveCelula)) grupos.set(chaveCelula, []);
      grupos.get(chaveCelula).push(r.risco);
    });

    const celulasFinal = new Map();
    grupos.forEach((riscos, chave) => {
      const media = riscos.reduce((soma, valor) => soma + valor, 0) / riscos.length;
      const arredondado = Math.round(media * 10) / 10;
      celulasFinal.set(chave, { risco: arredondado, nivel_risco: classificarNivelRisco(arredondado) });
    });

    return {
      linhas: [...linhasMapa.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR")),
      colunas: [...colunasSet].sort((a, b) => a.localeCompare(b, "pt-BR")),
      celulas: celulasFinal,
    };
  }, [resultados]);

  if (linhas.length === 0) {
    return (
      <p className={styles.semDados}>Nenhum dado disponível para os filtros selecionados.</p>
    );
  }

  return (
    <div className={styles.envoltorio}>
      <table className={styles.tabela}>
        <thead>
          <tr>
            <th scope="col" />
            {colunas.map((coluna) => (
              <th key={coluna} scope="col">
                {coluna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map(([chaveLinha, rotulo]) => (
            <tr key={chaveLinha}>
              <th scope="row">{rotulo}</th>
              {colunas.map((coluna) => {
                const celula = celulas.get(`${chaveLinha}|${coluna}`);
                if (!celula) {
                  return (
                    <td key={coluna} className={styles.celulaVazia}>
                      —
                    </td>
                  );
                }
                return (
                  <td
                    key={coluna}
                    className={`${styles.celula} ${styles[CLASSE_POR_NIVEL[celula.nivel_risco]]}`}
                    title={`${ROTULO_NIVEL_RISCO[celula.nivel_risco]} — risco ${celula.risco}`}
                  >
                    {ROTULO_NIVEL_RISCO[celula.nivel_risco]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
