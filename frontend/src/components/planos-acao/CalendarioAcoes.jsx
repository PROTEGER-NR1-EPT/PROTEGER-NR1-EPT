// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useMemo, useState } from "react";

import { corStatus } from "../../utils/statusAcao";
import styles from "./CalendarioAcoes.module.css";

const NOMES_MES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Grade de mês feita à mão (sem lib de calendário) — cálculo de dias em JS
// puro, ações exibidas como chip colorido por status no dia do prazo.
export function CalendarioAcoes({ acoes, onEditar }) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());

  const acoesPorDia = useMemo(() => {
    const mapa = new Map();
    acoes.forEach((acao) => {
      if (!acao.prazo) return;
      const [anoAcao, mesAcao, diaAcao] = acao.prazo.split("-").map(Number);
      if (anoAcao === ano && mesAcao - 1 === mes) {
        if (!mapa.has(diaAcao)) mapa.set(diaAcao, []);
        mapa.get(diaAcao).push(acao);
      }
    });
    return mapa;
  }, [acoes, ano, mes]);

  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();

  const celulas = [];
  for (let i = 0; i < primeiroDiaSemana; i += 1) celulas.push(null);
  for (let dia = 1; dia <= totalDias; dia += 1) celulas.push(dia);
  // Completa a última semana até fechar múltiplo de 7 — sem isso a grade
  // (que é um único CSS Grid contínuo) deixava as últimas colunas da
  // última linha sem nenhuma célula, aparecendo como um bloco vazio.
  while (celulas.length % 7 !== 0) celulas.push(null);

  function irParaMesAnterior() {
    if (mes === 0) {
      setMes(11);
      setAno((a) => a - 1);
    } else {
      setMes((m) => m - 1);
    }
  }

  function irParaProximoMes() {
    if (mes === 11) {
      setMes(0);
      setAno((a) => a + 1);
    } else {
      setMes((m) => m + 1);
    }
  }

  return (
    <div>
      <div className={styles.navegacao}>
        <button
          type="button"
          className={styles.botaoNav}
          onClick={irParaMesAnterior}
          aria-label="Mês anterior"
        >
          ‹
        </button>
        <span className={styles.tituloMes}>
          {NOMES_MES[mes]} {ano}
        </span>
        <button
          type="button"
          className={styles.botaoNav}
          onClick={irParaProximoMes}
          aria-label="Próximo mês"
        >
          ›
        </button>
      </div>

      <div className={styles.grade}>
        {DIAS_SEMANA.map((diaSemana) => (
          <div key={diaSemana} className={styles.cabecalhoDia}>
            {diaSemana}
          </div>
        ))}
        {celulas.map((dia, indice) => (
          <div
            key={indice}
            className={`${styles.celula} ${dia == null ? styles.celulaVazia : ""}`}
          >
            {dia != null && (
              <>
                <span className={styles.numeroDia}>{dia}</span>
                <div className={styles.itensDia}>
                  {(acoesPorDia.get(dia) ?? []).map((acao) => (
                    <button
                      key={acao.id}
                      type="button"
                      className={styles.chipAcao}
                      style={{ borderLeftColor: `var(${corStatus(acao.status)})` }}
                      onClick={() => onEditar(acao)}
                      title={acao.titulo}
                    >
                      {acao.titulo}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
