import { useEffect, useState } from "react";
import { Navigate, useNavigate, useOutletContext } from "react-router-dom";

import { Button } from "../../components/forms/Button";
import styles from "./LandingPage.module.css";

// Termo de Consentimento Livre e Esclarecido (docs/04, docs/09) — item em
// aberto, pendente de confirmação junto ao comitê de ética. Por isso esta
// tela só é efetivamente exibida quando a instituição selecionada indica
// exigência (`instituicao.tcle_obrigatorio`); caso contrário, a rota /tcle
// continua existindo (regra 3: "sem redesenhar as rotas"), mas passa
// direto para o questionário sem renderizar nada.
//
// O backend atual (ver docs/09) ainda não implementa esse campo — então,
// hoje, esta tela nunca aparece de fato. O código já está pronto para o
// dia em que a API passar a devolver `tcle_obrigatorio: true`.
export function TclePage() {
  const { instituicao, setor } = useOutletContext();
  const navigate = useNavigate();
  const [concordou, setConcordou] = useState(false);

  const tcleExigido = Boolean(instituicao?.tcle_obrigatorio);

  useEffect(() => {
    if (instituicao && setor && !tcleExigido) {
      navigate("/questionario", { replace: true });
    }
  }, [instituicao, setor, tcleExigido, navigate]);

  if (!instituicao || !setor) {
    return <Navigate to="/participar" replace />;
  }

  if (!tcleExigido) {
    return null;
  }

  function handleContinuar(evento) {
    evento.preventDefault();
    navigate("/questionario");
  }

  return (
    <section className={styles.secao}>
      <div className="container">
        <h1 className={styles.titulo}>Termo de Consentimento Livre e Esclarecido</h1>
        <div className={styles.introducao}>
          <p>
            Sua participação nesta pesquisa é voluntária e anônima. As
            respostas não podem ser associadas a você em nenhuma etapa —
            nenhum dado identificador (nome, e-mail, matrícula) é
            coletado. Os resultados são analisados apenas de forma
            agregada, por instituição e setor.
          </p>
          <p>
            Você pode interromper sua participação a qualquer momento antes
            de enviar as respostas, simplesmente fechando esta página.
          </p>
        </div>

        <form className={styles.formulario} onSubmit={handleContinuar}>
          <label>
            <input
              type="checkbox"
              checked={concordou}
              onChange={(evento) => setConcordou(evento.target.checked)}
            />{" "}
            Li e concordo em participar desta pesquisa.
          </label>
          <div style={{ marginTop: "1rem" }}>
            <Button type="submit" disabled={!concordou}>
              Continuar
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
