import { NavLink, Outlet } from "react-router-dom";

import styles from "./AdminLayout.module.css";

// Não estava na lista de arquivos pedida: junta a navegação persistente
// entre as páginas administrativas (mesma ideia de PublicFlowLayout.jsx)
// para não repetir o mesmo <nav> em cada uma das 7 páginas de admin/.
const LINKS = [
  { to: "/admin", rotulo: "Visão geral", fim: true },
  { to: "/admin/instituicoes", rotulo: "Instituições e setores" },
  { to: "/admin/questionarios", rotulo: "Questionários" },
  { to: "/admin/usuarios", rotulo: "Usuários" },
  { to: "/admin/configuracoes", rotulo: "Configurações" },
  { to: "/admin/exportacao", rotulo: "Exportação de dados" },
  { to: "/admin/logs", rotulo: "Log de atividade" },
];

export function AdminLayout() {
  return (
    <div className={`container ${styles.envoltorio}`}>
      <nav className={styles.nav} aria-label="Navegação administrativa">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.fim}
            className={({ isActive }) => (isActive ? styles.navAtivo : undefined)}
          >
            {link.rotulo}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
