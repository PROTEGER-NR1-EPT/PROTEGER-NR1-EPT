// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useState } from "react";

import { BotaoIcone } from "../common/BotaoIcone";
import { IconeEditar, IconeExcluir, IconeVer } from "../common/icones";
import { formatarDataBR } from "../../utils/data";
import { rotuloStatus } from "../../utils/statusAcao";
import tabela from "../../styles/tabela.module.css";
import styles from "./TabelaAcoes.module.css";

const COLUNAS = [
  { chave: "titulo", rotulo: "Ação" },
  { chave: "tag", rotulo: "Tag" },
  { chave: "status", rotulo: "Status" },
  { chave: "prazo", rotulo: "Prazo" },
  { chave: "responsavel", rotulo: "Responsável" },
];

// Primeira tabela ordenável por coluna do projeto — sem lib (útil pra
// listas pequenas como um plano de ação), clique no cabeçalho alterna
// asc/desc.
export function TabelaAcoes({ acoes, onEditar, onExcluir, somenteLeitura }) {
  const [ordenacao, setOrdenacao] = useState({ coluna: "prazo", direcao: "asc" });

  function alternarOrdenacao(coluna) {
    setOrdenacao((atual) =>
      atual.coluna === coluna
        ? { coluna, direcao: atual.direcao === "asc" ? "desc" : "asc" }
        : { coluna, direcao: "asc" }
    );
  }

  const acoesOrdenadas = [...acoes].sort((a, b) => {
    const valorA = a[ordenacao.coluna] ?? "";
    const valorB = b[ordenacao.coluna] ?? "";
    const comparacao = String(valorA).localeCompare(String(valorB), "pt-BR", { numeric: true });
    return ordenacao.direcao === "asc" ? comparacao : -comparacao;
  });

  return (
    <div className={tabela.envoltorioTabela}>
      <table className={tabela.tabela}>
        <thead>
          <tr>
            {COLUNAS.map((coluna) => (
              <th key={coluna.chave} scope="col">
                <button
                  type="button"
                  className={styles.botaoOrdenar}
                  onClick={() => alternarOrdenacao(coluna.chave)}
                >
                  {coluna.rotulo}
                  {ordenacao.coluna === coluna.chave && (ordenacao.direcao === "asc" ? "▲" : "▼")}
                </button>
              </th>
            ))}
            <th scope="col">Tarefas</th>
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>
          {acoesOrdenadas.map((acao) => {
            const totalTarefas = acao.tarefas?.length ?? 0;
            const tarefasConcluidas = acao.tarefas?.filter((t) => t.concluida).length ?? 0;
            return (
              <tr key={acao.id}>
                <td>{acao.titulo}</td>
                <td>{acao.tag || "—"}</td>
                <td>{rotuloStatus(acao.status)}</td>
                <td>{acao.prazo ? formatarDataBR(acao.prazo) : "—"}</td>
                <td>{acao.responsavel || "—"}</td>
                <td>{totalTarefas > 0 ? `${tarefasConcluidas}/${totalTarefas}` : "—"}</td>
                <td className={tabela.acoes}>
                  {somenteLeitura ? (
                    <BotaoIcone
                      icone={IconeVer}
                      rotulo={`Ver ${acao.titulo}`}
                      onClick={() => onEditar(acao)}
                    />
                  ) : (
                    <>
                      <BotaoIcone
                        icone={IconeEditar}
                        rotulo={`Editar ${acao.titulo}`}
                        onClick={() => onEditar(acao)}
                      />
                      <BotaoIcone
                        icone={IconeExcluir}
                        rotulo={`Excluir ${acao.titulo}`}
                        onClick={() => onExcluir(acao)}
                      />
                    </>
                  )}
                </td>
              </tr>
            );
          })}
          {acoesOrdenadas.length === 0 && (
            <tr>
              <td
                colSpan={7}
                style={{ color: "var(--cor-texto-secundario)", textAlign: "center" }}
              >
                Nenhuma ação cadastrada ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
