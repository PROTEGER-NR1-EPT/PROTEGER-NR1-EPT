import { useContext } from "react";

import { PreferencesContext } from "../context/PreferencesContext";

export function usePreferences() {
  const contexto = useContext(PreferencesContext);
  if (!contexto) {
    throw new Error("usePreferences precisa ser usado dentro de <PreferencesProvider>.");
  }
  return contexto;
}
