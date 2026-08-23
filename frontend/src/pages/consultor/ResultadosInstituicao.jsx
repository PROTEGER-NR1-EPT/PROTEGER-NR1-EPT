// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  listarMinhasInstituicoes,
  obterMemoria,
  obterResultados,
  obterResultadosDashboard,
} from "../../api/consultor";
import { CopsoqDominioBadge } from "../../components/resultados/CopsoqDominioBadge";
import { PageHeader } from "../../components/common/PageHeader";
import { KarasekQuadrante } from "../../components/resultados/KarasekQuadrante";
import { ResultadoIndisponivel } from "../../components/resultados/ResultadoIndisponivel";
import { ResultadosDashboard } from "../../components/resultados/ResultadosDashboard";
import tabela from "../../styles/tabela.module.css";
import { classificarResultado } from "../../utils/resultados";
import styles from "./ResultadosInstituicao.module.css";

export function ResultadosInstituicao() {
  const { instituicaoId } = useParams();

  const [instituicao, setInstituicao] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [resultadosDashboard, setResultadosDashboard] = useState([]);
  const [memoria, setMemoria] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    setCarregando(true);
    setErro(null);
    Promise.all([
      listarMinhasInstituicoes(),
      obterResultados(instituicaoId),
      obterResultadosDashboard(instituicaoId),
      obterMemoria(instituicaoId),
    ])
      .then(([instituicoesResposta, resultadosResposta, dashboardResposta, memoriaResposta]) => {
        setInstituicao(
          instituicoesResposta.find((i) => i.id === Number(instituicaoId)) ?? null
        );
        setResultados(resultadosResposta);
        setResultadosDashboard(dashboardResposta);
        setMemoria(memoriaResposta);
      })
      .catch((erroApi) => setErro(erroApi.mensagem))
      .finally(() => setCarregando(false));
  }, [instituicaoId]);

  // A API devolve linhas achatadas (uma por setor+questionário+domínio) —
  // agrupar por setor aqui é só apresentação, pra quem tem várias
  // instituições/setores conseguir saber de qual grupo cada cartão é.
  const gruposPorSetor = useMemo(() => {
    const mapa = new Map();
    resultados.forEach((resultado) => {
      if (!mapa.has(resultado.setor_id)) {
        mapa.set(resultado.setor_id, {
          id: resultado.setor_id,
          nome: resultado.setor_nome,
          itens: [],
        });
      }
      mapa.get(resultado.setor_id).itens.push(resultado);
    });
    return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [resultados]);

  if (carregando) return <p className="container">Carregando resultados...</p>;
  if (erro)
    return (
      <p className="container" role="alert">
        {erro}
      </p>
    );

  return (
    <section className={styles.secao}>
      <div className="container">
        <Link to="/consultor" className={styles.voltar}>
          ← Minhas instituições
        </Link>
        <PageHeader titulo={instituicao?.nome ?? "Resultados agregados"}>
          <p>
            Resultados agregados de uma instituição vinculada a você,
            protegidos por k-anonimato — grupos (setor + questionário) com
            respostas insuficientes pra preservar o anonimato de quem
            respondeu simplesmente não aparecem ainda.
          </p>
          <h3>Painel do topo</h3>
          <p>
            Cards-resumo, radar de dimensões e mapa de risco — as mesmas
            visualizações do painel de Resultados do Administrador, só que
            já filtradas pra esta instituição.
          </p>
          <h3>Resultados por setor</h3>
          <p>
            Abaixo do painel, os resultados aparecem agrupados por setor:
            quadrante de Karasek (demanda × controle) pra questionários
            Karasek, selos de nível de risco por domínio pra questionários
            COPSOQ.
          </p>
          <h3>Memória institucional</h3>
          <p>
            No fim da página, um histórico de registros (eventos, decisões,
            observações) relevantes pra entender o contexto da instituição
            ao longo do tempo.
          </p>
        </PageHeader>
        {instituicao && (instituicao.municipio || instituicao.uf) && (
          <p className={styles.subtitulo}>
            {[instituicao.municipio, instituicao.uf].filter(Boolean).join(" — ")}
          </p>
        )}

        {resultados.length === 0 && (
          <p className={tabela.semDados}>Ainda não há resultados para esta instituição.</p>
        )}

        {resultados.length > 0 && (
          <ResultadosDashboard resultados={resultadosDashboard} carregando={false} />
        )}

        {gruposPorSetor.map((grupo) => (
          <div key={grupo.id} className={styles.grupoSetor}>
            <h2 className={styles.tituloSetor}>{grupo.nome}</h2>
            <div className={styles.blocoResultados}>
              {grupo.itens.map((resultado) => {
                const tipo = classificarResultado(resultado);
                const chave = `${resultado.questionario_id}-${resultado.dominio_id ?? "geral"}`;
                if (tipo === "karasek_dominio") return null; // redundante com a linha geral
                if (tipo === "indisponivel")
                  return <ResultadoIndisponivel key={chave} resultado={resultado} />;
                if (tipo === "karasek_geral")
                  return <KarasekQuadrante key={chave} resultado={resultado} />;
                if (tipo === "copsoq_dominio")
                  return <CopsoqDominioBadge key={chave} resultado={resultado} />;
                return null;
              })}
            </div>
          </div>
        ))}

        <div className={styles.blocoMemoria}>
          <h2>Memória institucional</h2>
          {memoria.length === 0 && (
            <p className={tabela.semDados}>Nenhum registro de memória institucional ainda.</p>
          )}
          {memoria.map((registro) => (
            <article key={registro.id} className={styles.registroMemoria}>
              <h3>{registro.titulo}</h3>
              <p className={styles.registroMemoriaData}>
                {registro.tipo} — {new Date(registro.criado_em).toLocaleDateString("pt-BR")}
              </p>
              {registro.descricao && <p>{registro.descricao}</p>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
