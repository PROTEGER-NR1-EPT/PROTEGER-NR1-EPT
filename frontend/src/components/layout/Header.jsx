import { Link, useNavigate } from "react-router-dom";

import { ContrastToggle } from "../acessibilidade/ContrastToggle";
import { FontSizeControl } from "../acessibilidade/FontSizeControl";
import { useAuth } from "../../hooks/useAuth";
import styles from "./Header.module.css";

export function Header() {
  const { estaAutenticado, usuario, papel, sair } = useAuth();
  const navigate = useNavigate();

  async function handleSair() {
    await sair();
    navigate("/", { replace: true });
  }

  return (
    <header className={styles.cabecalho}>
      <div className={`container ${styles.ferramentasAcessibilidade}`}>
        <FontSizeControl />
        <ContrastToggle />
      </div>
      <div className={`container ${styles.barra}`}>
        <Link to="/" className={styles.marca}>
          PROTEGER-NR1 EPT
        </Link>
        <nav className={styles.nav} aria-label="Navegação principal">
          {!estaAutenticado && (
            <Link to="/login">Entrar (Consultor/Administrador)</Link>
          )}
          {estaAutenticado && papel === "consultor" && (
            <Link to="/consultor">Painel do Consultor</Link>
          )}
          {estaAutenticado && papel === "administrador" && (
            <Link to="/admin">Painel do Administrador</Link>
          )}
          {estaAutenticado && (
            <>
              <span aria-hidden="true">·</span>
              <span>{usuario.nome}</span>
              <button type="button" className={styles.botaoLink} onClick={handleSair}>
                Sair
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
