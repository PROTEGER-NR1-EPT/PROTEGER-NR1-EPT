import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

const HOME_POR_PAPEL = {
  consultor: "/consultor",
  administrador: "/admin",
};

// Usado em rotas que só fazem sentido para quem NÃO está logado (hoje,
// só /login): se um Consultor/Administrador já autenticado navegar até
// lá, manda direto para o respectivo dashboard em vez de mostrar o
// formulário de login de novo.
//
// As telas do fluxo público de resposta (LandingPage, TclePage,
// QuestionarioPage, ConfirmacaoPage) NÃO usam este guard — elas não têm
// nenhuma restrição de autenticação, então um Administrador logado
// também pode acessá-las normalmente (ex.: para conferir o formulário).
export function PublicRoute() {
  const { estaAutenticado, papel } = useAuth();

  if (estaAutenticado) {
    return <Navigate to={HOME_POR_PAPEL[papel] ?? "/"} replace />;
  }

  return <Outlet />;
}
