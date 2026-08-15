import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { listarMinhasInstituicoes } from "../../api/consultor";
import styles from "./DashboardConsultor.module.css";

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
        <h1>Minhas instituições</h1>

        {carregando && <p>Carregando...</p>}
        {erro && (
          <p role="alert" style={{ color: "var(--cor-perigo)" }}>
            {erro}
          </p>
        )}
        {!carregando && !erro && instituicoes.length === 0 && (
          <p>
            Você ainda não está vinculado a nenhuma instituição. Contate um
            Administrador.
          </p>
        )}

        <ul className={styles.lista}>
          {instituicoes.map((instituicao) => (
            <li key={instituicao.id} className={styles.itemLista}>
              <Link to={`/consultor/instituicoes/${instituicao.id}`}>
                {instituicao.nome}
                {instituicao.uf ? ` — ${instituicao.uf}` : ""}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
