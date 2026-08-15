import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { obterMemoria, obterResultados } from "../../api/consultor";
import { CopsoqDominioBadge } from "../../components/resultados/CopsoqDominioBadge";
import { KarasekQuadrante } from "../../components/resultados/KarasekQuadrante";
import { ResultadoIndisponivel } from "../../components/resultados/ResultadoIndisponivel";
import { classificarResultado } from "../../utils/resultados";
import styles from "./ResultadosInstituicao.module.css";

export function ResultadosInstituicao() {
  const { instituicaoId } = useParams();

  const [resultados, setResultados] = useState([]);
  const [memoria, setMemoria] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    setCarregando(true);
    setErro(null);
    Promise.all([obterResultados(instituicaoId), obterMemoria(instituicaoId)])
      .then(([resultadosResposta, memoriaResposta]) => {
        setResultados(resultadosResposta);
        setMemoria(memoriaResposta);
      })
      .catch((erroApi) => setErro(erroApi.mensagem))
      .finally(() => setCarregando(false));
  }, [instituicaoId]);

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
        <h1>Resultados agregados</h1>

        <div className={styles.blocoResultados}>
          {resultados.length === 0 && <p>Ainda não há resultados para esta instituição.</p>}
          {resultados.map((resultado) => {
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

        <div className={styles.blocoMemoria}>
          <h2>Memória institucional</h2>
          {memoria.length === 0 && <p>Nenhum registro de memória institucional ainda.</p>}
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
