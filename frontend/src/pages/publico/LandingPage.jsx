// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useNavigate, useOutletContext } from "react-router-dom";

import { Button } from "../../components/forms/Button";
import { DropdownInstituicao } from "../../components/forms/DropdownInstituicao";
import { DropdownSetor } from "../../components/forms/DropdownSetor";
import styles from "./LandingPage.module.css";

function IconeSelecao() {
  return (
    <svg viewBox="0 0 24 24" className={styles.iconeCartao} aria-hidden="true" focusable="false">
      <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="2" />
      <path d="M8 14h8M8 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconeCadeado() {
  return (
    <svg viewBox="0 0 24 24" className={styles.iconeCadeado} aria-hidden="true" focusable="false">
      <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// Primeira tela do fluxo do Usuário (docs/04): seleção de instituição e
// setor, sempre por dropdown (regra 2) — nunca texto livre. Não menciona
// nem sugere qual instrumento será aplicado (regra 1).
export function LandingPage() {
  const { instituicao, setInstituicao, setor, setSetor } = useOutletContext();
  const navigate = useNavigate();

  function handleInstituicaoChange(novaInstituicao) {
    setInstituicao(novaInstituicao);
    setSetor(null);
  }

  function handleContinuar(evento) {
    evento.preventDefault();
    navigate("/tcle");
  }

  return (
    <section className={styles.secao}>
      <div className="container">
        <div className={styles.cartao}>
          <IconeSelecao />
          <h1 className={styles.tituloCartao}>Pesquisa de Riscos Psicossociais</h1>
          <p className={styles.introducaoCartao}>
            Para começar, selecione sua instituição e seu setor.
          </p>

          <p className={styles.avisoAnonimato}>
            <IconeCadeado />
            <span>
              Sua participação é 100% anônima: nenhuma informação enviada aqui é associada a
              você.
            </span>
          </p>

          <form className={styles.formulario} onSubmit={handleContinuar}>
            <DropdownInstituicao
              value={instituicao?.id}
              onChange={handleInstituicaoChange}
              required
            />
            <DropdownSetor
              instituicaoId={instituicao?.id}
              value={setor?.id}
              onChange={setSetor}
              required
            />
            <Button type="submit" className={styles.botaoContinuar} disabled={!instituicao || !setor}>
              Continuar
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
