// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { createContext, useCallback, useEffect, useState } from "react";

// Contexto de preferências de acessibilidade (tamanho de fonte, alto
// contraste) — docs/02, regra 8 do prompt de implementação: vive em
// estado de aplicação (Context), nunca em localStorage/sessionStorage.
// Não estava listado em context/ na estrutura pedida (só AuthContext),
// mas é necessário para que FontSizeControl/ContrastToggle no Header
// afetem o app inteiro, então foi adicionado seguindo o mesmo padrão.

export const ESCALAS_FONTE = [0.875, 1, 1.15];
const INDICE_ESCALA_PADRAO = 1; // 1 = tamanho normal (100%)

export const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [indiceEscalaFonte, setIndiceEscalaFonte] = useState(INDICE_ESCALA_PADRAO);
  const [altoContraste, setAltoContraste] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--font-scale",
      String(ESCALAS_FONTE[indiceEscalaFonte])
    );
  }, [indiceEscalaFonte]);

  useEffect(() => {
    if (altoContraste) {
      document.documentElement.setAttribute("data-contraste", "alto");
    } else {
      document.documentElement.removeAttribute("data-contraste");
    }
  }, [altoContraste]);

  const diminuirFonte = useCallback(() => {
    setIndiceEscalaFonte((indice) => Math.max(0, indice - 1));
  }, []);

  const aumentarFonte = useCallback(() => {
    setIndiceEscalaFonte((indice) => Math.min(ESCALAS_FONTE.length - 1, indice + 1));
  }, []);

  const restaurarFonte = useCallback(() => {
    setIndiceEscalaFonte(INDICE_ESCALA_PADRAO);
  }, []);

  const alternarContraste = useCallback(() => {
    setAltoContraste((atual) => !atual);
  }, []);

  const valor = {
    indiceEscalaFonte,
    diminuirFonte,
    aumentarFonte,
    restaurarFonte,
    podeDiminuirFonte: indiceEscalaFonte > 0,
    podeAumentarFonte: indiceEscalaFonte < ESCALAS_FONTE.length - 1,
    altoContraste,
    alternarContraste,
  };

  return (
    <PreferencesContext.Provider value={valor}>{children}</PreferencesContext.Provider>
  );
}
