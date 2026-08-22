// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { usePreferences } from "../../hooks/usePreferences";
import { ROTULO_NIVEL_RISCO, corPorNivelRisco } from "../../utils/risco";
import styles from "./RadarDimensoes.module.css";

const NIVEIS = ["baixo", "moderado", "alto", "critico"];

function lerCor(variavel) {
  return getComputedStyle(document.documentElement).getPropertyValue(variavel).trim();
}

// recharts recebe cor como prop (SVG), não como CSS puro — por isso as
// cores são lidas de var(--cor-*) via getComputedStyle em vez de usadas
// direto no CSS Module. Recalcula quando o modo de alto contraste muda
// (usePreferences já é state React, então isso já dispara um novo render).
export function RadarDimensoes({ dados }) {
  const { altoContraste } = usePreferences();

  const cores = useMemo(
    () => ({
      linha: lerCor("--cor-primaria"),
      grade: lerCor("--cor-borda"),
      texto: lerCor("--cor-texto-secundario"),
      fundo: lerCor("--cor-fundo"),
      porNivel: Object.fromEntries(NIVEIS.map((nivel) => [nivel, lerCor(corPorNivelRisco(nivel))])),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [altoContraste]
  );

  if (dados.length === 0) {
    return (
      <p className={styles.semDados}>Nenhuma dimensão disponível para os filtros selecionados.</p>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={420}>
        <RadarChart data={dados} outerRadius="70%">
          <PolarGrid stroke={cores.grade} />
          <PolarAngleAxis dataKey="dimensao" tick={{ fill: cores.texto, fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fill: cores.texto, fontSize: 10 }} />
          <Radar
            name="Risco"
            dataKey="risco"
            stroke={cores.linha}
            fill={cores.linha}
            fillOpacity={0.15}
            dot={({ cx, cy, payload }) => (
              <circle
                key={payload.dimensao}
                cx={cx}
                cy={cy}
                r={5}
                fill={cores.porNivel[payload.nivel_risco] ?? cores.linha}
                stroke={cores.fundo}
                strokeWidth={1}
              />
            )}
          />
          <Tooltip
            formatter={(valor, _nome, item) => [
              `${valor} — ${ROTULO_NIVEL_RISCO[item.payload.nivel_risco] ?? ""}`,
              "Risco",
            ]}
            contentStyle={{
              background: cores.fundo,
              border: `1px solid ${cores.grade}`,
              color: lerCor("--cor-texto"),
            }}
          />
        </RadarChart>
      </ResponsiveContainer>

      <div className={styles.legenda}>
        {NIVEIS.map((nivel) => (
          <span key={nivel} className={styles.legendaItem}>
            <span
              className={styles.ponto}
              style={{ background: cores.porNivel[nivel] }}
              aria-hidden="true"
            />
            {ROTULO_NIVEL_RISCO[nivel]}
          </span>
        ))}
      </div>
    </div>
  );
}
