import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

const HOME_POR_PAPEL = {
  consultor: "/consultor",
  administrador: "/admin",
};

// Bloqueia por papel (regra 6 do prompt de implementação): uma rota de
// /admin não pode ser acessada por um Consultor, e vice-versa.
//
// IMPORTANTE: isto é proteção de navegação (UX), não a proteção "de
// verdade" — essa é sempre feita pelo backend, que responde 401/403 por
// rota conforme app/auth/decorators.py. Este componente só evita que um
// usuário sem permissão veja uma tela que a API rejeitaria de qualquer
// forma; api/client.js reage a um 401 do servidor limpando a sessão
// mesmo que o estado local aqui estivesse (por algum bug) desatualizado.
export function ProtectedRoute({ papeisPermitidos }) {
  const { estaAutenticado, papel, carregando } = useAuth();
  const location = useLocation();

  if (carregando) {
    return null;
  }

  if (!estaAutenticado) {
    return <Navigate to="/login" replace state={{ de: location.pathname }} />;
  }

  if (!papeisPermitidos.includes(papel)) {
    return <Navigate to={HOME_POR_PAPEL[papel] ?? "/login"} replace />;
  }

  return <Outlet />;
}
