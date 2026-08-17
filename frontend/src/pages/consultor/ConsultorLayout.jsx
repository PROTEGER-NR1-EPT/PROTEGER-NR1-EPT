import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import styles from "./ConsultorLayout.module.css";

const CHAVE_RECOLHIDA = "proteger-nr1-consultor-sidebar-recolhida";

// Mesma ideia de AdminLayout.jsx (navegação persistente entre as páginas do
// Consultor), mas com só 2 itens de menu — Resultados e Planos de ação —
// já que o Consultor só enxerga essas duas áreas (mais o próprio perfil e
// sair, no rodapé).
const LINKS = [
  { to: "/consultor", rotulo: "Resultados", fim: true, Icone: IconeResultados },
  { to: "/consultor/planos-acao", rotulo: "Planos de ação", Icone: IconePlanosDeAcao },
];

export function ConsultorLayout() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();
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
        <nav className={styles.nav} aria-label="Navegação do consultor">
          {LINKS.map(({ to, rotulo, fim, Icone }) => (
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
              to="/consultor/perfil"
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
                <span className={styles.papelUsuario}>Consultor</span>
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
