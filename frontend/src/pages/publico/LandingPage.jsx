import { useNavigate, useOutletContext } from "react-router-dom";

import { Button } from "../../components/forms/Button";
import { DropdownInstituicao } from "../../components/forms/DropdownInstituicao";
import { DropdownSetor } from "../../components/forms/DropdownSetor";
import styles from "./LandingPage.module.css";

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
        <h1 className={styles.titulo}>Pesquisa de Riscos Psicossociais</h1>
        <p className={styles.introducao}>
          Sua participação é anônima: nenhuma informação enviada aqui é
          associada a você. Para começar, selecione sua instituição e seu
          setor.
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
          <Button type="submit" disabled={!instituicao || !setor}>
            Continuar
          </Button>
        </form>
      </div>
    </section>
  );
}
