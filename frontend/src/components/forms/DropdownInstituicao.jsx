// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useId, useState } from "react";

import { listarInstituicoes as listarInstituicoesPublico } from "../../api/publico";
import styles from "./FormField.module.css";

/**
 * Seleção de instituição — SEMPRE dropdown, nunca texto livre (regra 2 do
 * prompt de implementação: vale também para telas administrativas de
 * filtro). Por padrão busca a lista pública (só instituições ativas); uma
 * tela administrativa pode passar `carregarInstituicoes` apontando para
 * api/admin.js:listarInstituicoes para ver também instituições inativas,
 * sem duplicar este componente.
 *
 * Chama onChange com o objeto inteiro da instituição selecionada (não só
 * o id), para telas que precisam de outros campos dela (ex.: um futuro
 * `tcle_obrigatorio` — ver TclePage.jsx).
 */
export function DropdownInstituicao({
  value,
  onChange,
  carregarInstituicoes = listarInstituicoesPublico,
  label = "Instituição",
  required = false,
}) {
  const [instituicoes, setInstituicoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const id = useId();

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    carregarInstituicoes()
      .then((lista) => {
        if (!cancelado) setInstituicoes(lista);
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar a lista de instituições.");
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [carregarInstituicoes]);

  function handleChange(evento) {
    const idSelecionado = Number(evento.target.value) || null;
    const instituicao = instituicoes.find((i) => i.id === idSelecionado) || null;
    onChange(instituicao);
  }

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
        disabled={carregando}
        required={required}
      >
        <option value="">
          {carregando ? "Carregando..." : "Selecione uma instituição"}
        </option>
        {instituicoes.map((instituicao) => (
          <option key={instituicao.id} value={instituicao.id}>
            {instituicao.nome}
            {instituicao.uf ? ` (${instituicao.uf})` : ""}
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
