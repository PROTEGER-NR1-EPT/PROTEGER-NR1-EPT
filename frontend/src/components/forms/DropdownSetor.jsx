// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useId, useState } from "react";

import { listarSetores as listarSetoresPublico } from "../../api/publico";
import styles from "./FormField.module.css";

/**
 * Seleção de setor, filtrada pela instituição escolhida — SEMPRE dropdown
 * (regra 2). Fica desabilitado e vazio até que uma instituição seja
 * selecionada. Assim como DropdownInstituicao, aceita um fetcher
 * alternativo para reuso em telas administrativas.
 */
export function DropdownSetor({
  instituicaoId,
  value,
  onChange,
  carregarSetores = listarSetoresPublico,
  label = "Setor",
  required = false,
}) {
  const [setores, setSetores] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const id = useId();

  useEffect(() => {
    if (!instituicaoId) {
      setSetores([]);
      return;
    }
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    carregarSetores(instituicaoId)
      .then((lista) => {
        if (!cancelado) setSetores(lista);
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar a lista de setores.");
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [instituicaoId, carregarSetores]);

  function handleChange(evento) {
    const idSelecionado = Number(evento.target.value) || null;
    const setor = setores.find((s) => s.id === idSelecionado) || null;
    onChange(setor);
  }

  const desabilitado = !instituicaoId || carregando;

  return (
    <div className={styles.campo}>
      <label htmlFor={id} className={styles.rotulo}>
        {label}
      </label>
      <select
        id={id}
        className={styles.controle}
        value={value ?? ""}
        onChange={handleChange}
        disabled={desabilitado}
        required={required}
      >
        <option value="">
          {!instituicaoId
            ? "Selecione a instituição primeiro"
            : carregando
              ? "Carregando..."
              : "Selecione um setor"}
        </option>
        {setores.map((setor) => (
          <option key={setor.id} value={setor.id}>
            {setor.nome}
          </option>
        ))}
      </select>
      {erro && (
        <p className={styles.mensagemErro} role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
