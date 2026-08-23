// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { listarMinhasInstituicoes } from "../../api/consultor";
import { PageHeader } from "../../components/common/PageHeader";
import tabela from "../../styles/tabela.module.css";
import styles from "./DashboardConsultor.module.css";

function IconeInstituicao() {
  return (
    <svg viewBox="0 0 24 24" className={styles.iconeItem} aria-hidden="true" focusable="false">
      <path d="M4 21V7l8-4 8 4v14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 21v-6h6v6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 21h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function DashboardConsultor() {
  const [instituicoes, setInstituicoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    listarMinhasInstituicoes()
      .then(setInstituicoes)
      .catch((erroApi) => setErro(erroApi.mensagem))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <section className={styles.secao}>
      <div className="container">
        <PageHeader titulo="Minhas instituições">
          <p>
            Tela inicial do painel do Consultor — lista as instituições que
            um Administrador vinculou a você. Você só vê e atua nas
            instituições que aparecem aqui; se faltar alguma, peça a um
            Administrador pra te vincular a ela (em "Usuários", aba
            "Vínculos institucionais").
          </p>
          <p>
            Clique numa instituição pra abrir os resultados agregados dela.
            De lá, use o menu lateral pra acessar também os Planos de ação
            daquela instituição.
          </p>
        </PageHeader>

        {carregando && <p>Carregando...</p>}
        {erro && (
          <p role="alert" className={styles.erro}>
            {erro}
          </p>
        )}
        {!carregando && !erro && instituicoes.length === 0 && (
          <p className={tabela.semDados}>
            Você ainda não está vinculado a nenhuma instituição. Contate um Administrador.
          </p>
        )}

        <ul className={styles.lista}>
          {instituicoes.map((instituicao) => (
            <li key={instituicao.id}>
              <Link to={`/consultor/instituicoes/${instituicao.id}`} className={styles.itemLista}>
                <IconeInstituicao />
                <span className={styles.textoItem}>
                  <span className={styles.nomeItem}>{instituicao.nome}</span>
                  {(instituicao.municipio || instituicao.uf) && (
                    <span className={styles.detalheItem}>
                      {[instituicao.municipio, instituicao.uf].filter(Boolean).join(" — ")}
                    </span>
                  )}
                </span>
                <span className={styles.setaItem} aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
