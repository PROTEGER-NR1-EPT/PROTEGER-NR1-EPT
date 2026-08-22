// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useContext } from "react";

import { PreferencesContext } from "../context/PreferencesContext";

export function usePreferences() {
  const contexto = useContext(PreferencesContext);
  if (!contexto) {
    throw new Error("usePreferences precisa ser usado dentro de <PreferencesProvider>.");
  }
  return contexto;
}
