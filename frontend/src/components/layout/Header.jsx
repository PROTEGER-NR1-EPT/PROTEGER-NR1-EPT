// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { Link, useLocation, useNavigate } from "react-router-dom";

import { AcessibilidadeWidget } from "../acessibilidade/AcessibilidadeWidget";
import { ChatAjudaWidget } from "../chat/ChatAjudaWidget";
import { IconeEntrar } from "../common/icones";
import { useAuth } from "../../hooks/useAuth";
import { useChatDisponivel } from "../../hooks/useChatDisponivel";
import styles from "./Header.module.css";

// Rotas onde o widget flutuante não aparece por ser redundante — a
// própria página já é a experiência completa de chat.
const ROTAS_SEM_WIDGET_CHAT = ["/admin/assistente-ia", "/consultor/assistente-ia"];

export function Header() {
  const { estaAutenticado, usuario, papel, sair } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const papelValido = papel === "consultor" || papel === "administrador";
  const chatDisponivel = useChatDisponivel(estaAutenticado && papelValido);
  const naPaginaAssistenteIa = ROTAS_SEM_WIDGET_CHAT.includes(pathname);

  async function handleSair() {
    await sair();
    navigate("/", { replace: true });
  }

  return (
    <header className={styles.cabecalho}>
      <AcessibilidadeWidget />
      {estaAutenticado && papelValido && chatDisponivel && !naPaginaAssistenteIa && (
        <ChatAjudaWidget />
      )}
      <div className={`container ${styles.barra}`}>
        <Link to="/" className={styles.marca}>
          <img src="/logo-icone.png" alt="" className={styles.logo} />
          PROTEGER-NR1 EPT
        </Link>
        <nav className={styles.nav} aria-label="Navegação principal">
          {!estaAutenticado && (
            <Link to="/login" className={styles.linkEntrar} aria-label="Entrar (Consultor/Administrador)">
              <IconeEntrar className={styles.iconeEntrar} />
              <span className={styles.dicaEntrar} aria-hidden="true">
                Entrar (Consultor/Administrador)
              </span>
            </Link>
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
