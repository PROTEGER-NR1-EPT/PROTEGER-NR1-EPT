// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useContext } from "react";

import { AuthContext } from "../context/AuthContext";

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth precisa ser usado dentro de <AuthProvider>.");
  }
  return contexto;
}
