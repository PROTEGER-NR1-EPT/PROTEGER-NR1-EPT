// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useState } from "react";

import { obterEstatisticas } from "../../api/admin";
import { useAuth } from "../../hooks/useAuth";
import tabela from "../../styles/tabela.module.css";
import styles from "./DashboardAdmin.module.css";

function IconeInstituicoes() {
  return (
    <svg viewBox="0 0 24 24" className={styles.iconeCartao} aria-hidden="true" focusable="false">
      <path d="M4 21V7l8-4 8 4v14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 21v-6h6v6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 21h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconeQuestionarios() {
  return (
    <svg viewBox="0 0 24 24" className={styles.iconeCartao} aria-hidden="true" focusable="false">
      <rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 8h8M8 12h8M8 16h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconeUsuarios() {
  return (
    <svg viewBox="0 0 24 24" className={styles.iconeCartao} aria-hidden="true" focusable="false">
      <circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="17" cy="8" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M15.5 14.8c2.6.4 4.5 2.3 4.5 5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconeRespostas() {
  return (
    <svg viewBox="0 0 24 24" className={styles.iconeCartao} aria-hidden="true" focusable="false">
      <path
        d="M4 20V10M10 20V4M16 20v-7M4 20h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DashboardAdmin() {
  const { usuario } = useAuth();
  const [estatisticas, setEstatisticas] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    obterEstatisticas()
      .then(setEstatisticas)
      .catch((erroApi) => setErro(erroApi.mensagem))
      .finally(() => setCarregando(false));
  }, []);

  const maiorTotalPorInstituicao = Math.max(
    1,
    ...(estatisticas?.por_instituicao?.map((linha) => linha.total_respostas) ?? [])
  );

  return (
    <section>
      <h1>Painel do Administrador</h1>
      <p>
        Olá, {usuario?.nome}. Use o menu para gerenciar instituições,
        setores, questionários, usuários, configurações do sistema,
        exportação de dados e o log de atividade.
      </p>

      {carregando && <p>Carregando estatísticas...</p>}
      {erro && (
        <p role="alert" style={{ color: "var(--cor-perigo)" }}>
          {erro}
        </p>
      )}

      {estatisticas && (
        <>
          <div className={styles.grade}>
            <div className={styles.cartao}>
              <IconeInstituicoes />
              <h2 className={styles.tituloCartao}>Instituições</h2>
              <p className={styles.numeroPrincipal}>{estatisticas.instituicoes.total}</p>
              <p className={styles.detalheCartao}>{estatisticas.instituicoes.ativas} ativas</p>
            </div>

            <div className={styles.cartao}>
              <IconeQuestionarios />
              <h2 className={styles.tituloCartao}>Questionários</h2>
              <p className={styles.numeroPrincipal}>{estatisticas.questionarios.total}</p>
              <p className={styles.detalheCartao}>{estatisticas.questionarios.ativos} ativos</p>
            </div>

            <div className={styles.cartao}>
              <IconeUsuarios />
              <h2 className={styles.tituloCartao}>Usuários</h2>
              <p className={styles.numeroPrincipal}>
                {estatisticas.usuarios.consultores + estatisticas.usuarios.administradores}
              </p>
              <p className={styles.detalheCartao}>
                {estatisticas.usuarios.consultores} consultores ·{" "}
                {estatisticas.usuarios.administradores} administradores
              </p>
            </div>

            <div className={styles.cartao}>
              <IconeRespostas />
              <h2 className={styles.tituloCartao}>Respostas</h2>
              <p className={styles.numeroPrincipal}>{estatisticas.respostas.total}</p>
              <p className={styles.detalheCartao}>
                {estatisticas.respostas.ultimos_7_dias} nos últimos 7 dias ·{" "}
                {estatisticas.respostas.ultimos_30_dias} nos últimos 30 dias
              </p>
            </div>
          </div>

          {estatisticas.k_anonimato.grupos_abaixo_threshold > 0 && (
            <div className={styles.avisoKAnonimato} role="status">
              <p>
                <strong>
                  {estatisticas.k_anonimato.grupos_abaixo_threshold}{" "}
                  {estatisticas.k_anonimato.grupos_abaixo_threshold === 1
                    ? "grupo está"
                    : "grupos estão"}{" "}
                  aguardando mais respostas
                </strong>
              </p>
              <p>
                Grupos de instituição, setor e questionário com pelo menos uma
                resposta ainda não atingiram o mínimo de{" "}
                {estatisticas.k_anonimato.threshold_atual} respostas exigido
                para proteger o anonimato de quem respondeu — por isso o
                resultado deles ainda não fica visível. Por privacidade, esta
                contagem não identifica quais grupos são.
              </p>
            </div>
          )}

          <div className={tabela.secaoAdmin}>
            <h2>Respostas por instituição</h2>
            {estatisticas.por_instituicao.length === 0 ? (
              <p className={tabela.semDados}>Ainda não há respostas registradas.</p>
            ) : (
              <div className={tabela.envoltorioTabela}>
                <table className={tabela.tabela}>
                  <caption className="visualmente-oculto">
                    Top 10 instituições por total de respostas recebidas
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Instituição</th>
                      <th scope="col">Respostas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estatisticas.por_instituicao.map((linha) => (
                      <tr key={linha.instituicao_id}>
                        <td>{linha.nome}</td>
                        <td>
                          <div className={styles.linhaRanking}>
                            <span className={styles.barraRanking}>
                              <span
                                className={styles.barraRankingPreenchida}
                                style={{
                                  width: `${(linha.total_respostas / maiorTotalPorInstituicao) * 100}%`,
                                }}
                              />
                            </span>
                            <span className={styles.valorRanking}>{linha.total_respostas}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
