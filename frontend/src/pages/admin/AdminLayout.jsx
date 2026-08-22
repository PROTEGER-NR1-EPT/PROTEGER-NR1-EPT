// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { useChatDisponivel } from "../../hooks/useChatDisponivel";
import styles from "./AdminLayout.module.css";

const CHAVE_RECOLHIDA = "proteger-nr1-admin-sidebar-recolhida";

// Não estava na lista de arquivos pedida: junta a navegação persistente
// entre as páginas administrativas (mesma ideia de PublicFlowLayout.jsx)
// para não repetir o mesmo menu em cada uma das 7 páginas de admin/.
// Vira sidebar (colapsável p/ ícones em telas largas, barra inferior em
// telas estreitas) em vez do <nav> horizontal anterior.
const LINKS = [
  { to: "/admin", rotulo: "Visão geral", fim: true, Icone: IconeVisaoGeral },
  { to: "/admin/resultados", rotulo: "Resultados", Icone: IconeResultados },
  { to: "/admin/planos-acao", rotulo: "Planos de ação", Icone: IconePlanosDeAcao },
  { to: "/admin/instituicoes", rotulo: "Instituições e setores", Icone: IconeInstituicoes },
  { to: "/admin/questionarios", rotulo: "Questionários", Icone: IconeQuestionarios },
  { to: "/admin/usuarios", rotulo: "Usuários", Icone: IconeUsuarios },
  {
    to: "/admin/assistente-ia",
    rotulo: "Assistente IA",
    Icone: IconeAssistenteIA,
    apenasSeChatDisponivel: true,
  },
  { to: "/admin/configuracoes", rotulo: "Configurações", Icone: IconeConfiguracoes },
];

export function AdminLayout() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();
  const chatDisponivel = useChatDisponivel();
  const links = LINKS.filter((link) => !link.apenasSeChatDisponivel || chatDisponivel);
  const [recolhida, setRecolhida] = useState(() => {
    try {
      return window.localStorage.getItem(CHAVE_RECOLHIDA) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAVE_RECOLHIDA, String(recolhida));
    } catch {
      // Preferência de UI apenas — se não puder persistir, segue sem quebrar.
    }
  }, [recolhida]);

  async function handleSair() {
    await sair();
    navigate("/", { replace: true });
  }

  return (
    <div className={styles.envoltorio}>
      <aside
        className={`${styles.sidebar} ${recolhida ? styles.sidebarRecolhida : ""}`}
      >
        <nav className={styles.nav} aria-label="Navegação administrativa">
          {links.map(({ to, rotulo, fim, Icone }) => (
            <NavLink
              key={to}
              to={to}
              end={fim}
              aria-label={rotulo}
              title={recolhida ? rotulo : undefined}
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.linkAtivo : ""}`
              }
            >
              <Icone className={styles.icone} />
              <span className={styles.rotulo}>{rotulo}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.rodape}>
          <div className={styles.usuario}>
            <NavLink
              to="/admin/perfil"
              className={({ isActive }) =>
                `${styles.linkUsuario} ${isActive ? styles.linkUsuarioAtivo : ""}`
              }
              title="Meu perfil"
            >
              <span className={styles.avatar} aria-hidden="true">
                {usuario?.nome?.charAt(0).toUpperCase()}
              </span>
              <span className={styles.infoUsuario}>
                <span className={styles.nomeUsuario}>{usuario?.nome}</span>
                <span className={styles.papelUsuario}>Administrador</span>
              </span>
            </NavLink>
            <button
              type="button"
              className={styles.botaoSair}
              onClick={handleSair}
              aria-label="Sair"
              title="Sair"
            >
              <IconeSair className={styles.icone} />
            </button>
          </div>

          <button
            type="button"
            className={styles.botaoRecolher}
            onClick={() => setRecolhida((atual) => !atual)}
            aria-pressed={recolhida}
            aria-label={recolhida ? "Expandir menu" : "Encolher menu"}
            title={recolhida ? "Expandir menu" : "Encolher menu"}
          >
            <IconeRecolher className={`${styles.icone} ${recolhida ? styles.iconeInvertido : ""}`} />
          </button>
        </div>
      </aside>

      <main className={styles.conteudo}>
        <Outlet />
      </main>
    </div>
  );
}

function IconeVisaoGeral({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconeResultados({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
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

function IconePlanosDeAcao({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect x="3" y="4" width="5" height="16" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9.5" y="4" width="5" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="16" y="4" width="5" height="13" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconeInstituicoes({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path d="M4 21V7l8-4 8 4v14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 21v-6h6v6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 21h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconeQuestionarios({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconeUsuarios({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
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

function IconeAssistenteIA({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M4 4h16v11H8l-4 4V4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 6.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeConfiguracoes({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect x="10.7" y="1" width="2.6" height="3.2" rx="0.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <rect
        x="10.7"
        y="1"
        width="2.6"
        height="3.2"
        rx="0.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        transform="rotate(45 12 12)"
      />
      <rect
        x="10.7"
        y="1"
        width="2.6"
        height="3.2"
        rx="0.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        transform="rotate(90 12 12)"
      />
      <rect
        x="10.7"
        y="1"
        width="2.6"
        height="3.2"
        rx="0.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        transform="rotate(135 12 12)"
      />
      <rect
        x="10.7"
        y="1"
        width="2.6"
        height="3.2"
        rx="0.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        transform="rotate(180 12 12)"
      />
      <rect
        x="10.7"
        y="1"
        width="2.6"
        height="3.2"
        rx="0.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        transform="rotate(225 12 12)"
      />
      <rect
        x="10.7"
        y="1"
        width="2.6"
        height="3.2"
        rx="0.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        transform="rotate(270 12 12)"
      />
      <rect
        x="10.7"
        y="1"
        width="2.6"
        height="3.2"
        rx="0.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        transform="rotate(315 12 12)"
      />
      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconeSair({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 8l4 4-4 4M9 12h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeRecolher({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M15 6l-6 6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
