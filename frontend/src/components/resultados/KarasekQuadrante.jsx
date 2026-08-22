// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { Fragment } from "react";

import styles from "./KarasekQuadrante.module.css";

// Quadrantes do Karasek Demand-Control (docs/06). O valor de `quadrante`
// vem pronto do backend (backend/app/services/instrumentos/karasek.py) —
// este componente só posiciona e rotula, nunca recalcula.
const QUADRANTES = {
  alto_desgaste: { linha: 0, coluna: 0, rotulo: "Alto desgaste", descricao: "maior risco" },
  trabalho_ativo: { linha: 0, coluna: 1, rotulo: "Trabalho ativo", descricao: null },
  trabalho_passivo: { linha: 1, coluna: 0, rotulo: "Trabalho passivo", descricao: null },
  baixo_desgaste: { linha: 1, coluna: 1, rotulo: "Baixo desgaste", descricao: "menor risco" },
};

const POSICOES = [
  ["alto_desgaste", "trabalho_ativo"],
  ["trabalho_passivo", "baixo_desgaste"],
];

/**
 * `resultado` é o item de /resultados cujo valor_agregado tem a chave
 * `quadrante` (a linha "geral" do Karasek, com dominio_id nulo) — ver
 * ResultadosInstituicao.jsx para como as linhas são classificadas.
 */
export function KarasekQuadrante({ resultado }) {
  const { quadrante, demanda_media: demandaMedia, controle_media: controleMedia } =
    resultado.valor_agregado;

  return (
    <div className={styles.cartao}>
      <h3 className={styles.titulo}>Quadrante Karasek (demanda × controle)</h3>
      <div className={styles.grade} role="table" aria-label="Quadrantes de Karasek">
        <div className={styles.eixoCanto} />
        <div className={styles.eixoTopo}>Baixo controle</div>
        <div className={styles.eixoTopo}>Alto controle</div>

        {POSICOES.map((linhaChaves, indiceLinha) => (
          <Fragment key={`linha-${indiceLinha}`}>
            <div className={styles.eixoLateral}>
              {indiceLinha === 0 ? "Alta demanda" : "Baixa demanda"}
            </div>
            {linhaChaves.map((chave) => {
              const info = QUADRANTES[chave];
              const ativo = chave === quadrante;
              return (
                <div
                  key={chave}
                  className={`${styles.celula} ${ativo ? styles.celulaAtiva : ""}`}
                  role="cell"
                  aria-current={ativo ? "true" : undefined}
                >
                  <span>{info.rotulo}</span>
                  {info.descricao && (
                    <span className="visualmente-oculto">({info.descricao})</span>
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>

      <div className={styles.medias}>
        <span>Média de demanda: {demandaMedia ?? "—"}</span>
        <span>Média de controle: {controleMedia ?? "—"}</span>
      </div>

      <p className={styles.legenda}>
        Baseado em {resultado.n_respostas} respostas. Resultado agregado do
        grupo — nunca calculado nem exibido por respondente individual
        (docs/06).
      </p>
    </div>
  );
}
