import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { listarMinhasInstituicoes, obterMemoria, obterResultados } from "../../api/consultor";
import { CopsoqDominioBadge } from "../../components/resultados/CopsoqDominioBadge";
import { KarasekQuadrante } from "../../components/resultados/KarasekQuadrante";
import { ResultadoIndisponivel } from "../../components/resultados/ResultadoIndisponivel";
import tabela from "../../styles/tabela.module.css";
import { classificarResultado } from "../../utils/resultados";
import styles from "./ResultadosInstituicao.module.css";

export function ResultadosInstituicao() {
  const { instituicaoId } = useParams();

  const [instituicao, setInstituicao] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [memoria, setMemoria] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    setCarregando(true);
    setErro(null);
    Promise.all([
      listarMinhasInstituicoes(),
      obterResultados(instituicaoId),
      obterMemoria(instituicaoId),
    ])
      .then(([instituicoesResposta, resultadosResposta, memoriaResposta]) => {
        setInstituicao(
          instituicoesResposta.find((i) => i.id === Number(instituicaoId)) ?? null
        );
        setResultados(resultadosResposta);
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
        <h1 className={styles.titulo}>{instituicao?.nome ?? "Resultados agregados"}</h1>
        {instituicao && (instituicao.municipio || instituicao.uf) && (
          <p className={styles.subtitulo}>
            {[instituicao.municipio, instituicao.uf].filter(Boolean).join(" — ")}
          </p>
        )}

        {resultados.length === 0 && (
          <p className={tabela.semDados}>Ainda não há resultados para esta instituição.</p>
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
