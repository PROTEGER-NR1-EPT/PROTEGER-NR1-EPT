import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useOutletContext } from "react-router-dom";

import { obterQuestionarioAtivo, enviarRespostas } from "../../api/publico";
import { Button } from "../../components/forms/Button";
import styles from "./QuestionarioPage.module.css";

function IconeIndisponivel() {
  return (
    <svg viewBox="0 0 24 24" className={styles.iconeCartao} aria-hidden="true" focusable="false">
      <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="2" />
      <path d="M8 15h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Convenção simples de regra condicional (regra "regra condicional
// simples" do escopo do MVP): { dependeDoItem: <item_id>, valorEsperado: <valor> }.
// O backend guarda `regra_condicional` como JSON livre
// (backend/app/models/anonimo.py) sem interpretar seu conteúdo — esta é a
// única forma que o frontend entende hoje; um item com um formato
// diferente (ou sem regra) é sempre exibido.
function itemDeveSerExibido(item, respostas) {
  const regra = item.regra_condicional;
  if (!regra || regra.dependeDoItem == null) {
    return true;
  }
  return respostas[regra.dependeDoItem] === regra.valorEsperado;
}

export function QuestionarioPage() {
  const { instituicao, setor, limparFluxo } = useOutletContext();
  const navigate = useNavigate();

  const [questionario, setQuestionario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState(null);

  useEffect(() => {
    if (!instituicao || !setor) return;
    let cancelado = false;
    setCarregando(true);
    obterQuestionarioAtivo(instituicao.id, setor.id)
      .then((dados) => {
        if (!cancelado) setQuestionario(dados);
      })
      .catch((erro) => {
        if (!cancelado) setErroCarregamento(erro);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [instituicao, setor]);

  const itensVisiveis = useMemo(() => {
    if (!questionario) return [];
    return questionario.itens.filter((item) => itemDeveSerExibido(item, respostas));
  }, [questionario, respostas]);

  const todosVisiveisRespondidos = itensVisiveis.every(
    (item) => respostas[item.id] !== undefined
  );

  const totalItensVisiveis = itensVisiveis.length;
  const totalRespondidos = itensVisiveis.filter(
    (item) => respostas[item.id] !== undefined
  ).length;

  if (!instituicao || !setor) {
    return <Navigate to="/participar" replace />;
  }

  function handleRespostaItem(itemId, valor) {
    setRespostas((atual) => ({ ...atual, [itemId]: valor }));
  }

  function handleEscolherOutra() {
    limparFluxo();
    navigate("/participar");
  }

  async function handleEnviar(evento) {
    evento.preventDefault();
    setEnviando(true);
    setErroEnvio(null);
    try {
      // Só envia respostas de itens ainda visíveis — um item escondido por
      // regra condicional não deve ir no payload.
      const respostasVisiveis = {};
      itensVisiveis.forEach((item) => {
        respostasVisiveis[item.id] = respostas[item.id];
      });

      await enviarRespostas({
        questionarioId: questionario.questionario_id,
        instituicaoId: instituicao.id,
        setorId: setor.id,
        respostas: respostasVisiveis,
      });

      // Não chama limparFluxo() aqui: isso zeraria instituicao/setor
      // enquanto esta página ainda está montada, e o guard logo abaixo
      // ("if (!instituicao || !setor) return <Navigate to='/participar' .../>")
      // dispararia no mesmo instante, competindo com este navigate() —
      // ConfirmacaoPage.jsx é quem limpa o fluxo, com ela já montada.
      navigate("/confirmacao");
    } catch (erro) {
      setErroEnvio(erro.mensagem);
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return (
      <section className="container">
        <p className={styles.mensagemEstado}>Carregando questionário...</p>
      </section>
    );
  }

  if (erroCarregamento) {
    const semQuestionarioVinculado = erroCarregamento.erro === "questionario_indisponivel";

    if (semQuestionarioVinculado) {
      return (
        <section className={styles.secao}>
          <div className="container">
            <div className={styles.cartaoEstado} role="status">
              <IconeIndisponivel />
              <h1 className={styles.tituloCartaoEstado}>Nenhum questionário disponível</h1>
              <p className={styles.textoCartaoEstado}>
                A instituição e o setor selecionados ainda não têm um questionário ativo. Isso
                costuma acontecer quando a pesquisa ainda não foi liberada por lá — tente
                novamente mais tarde ou fale com quem coordena a pesquisa na sua instituição.
              </p>
              <Button onClick={handleEscolherOutra}>Escolher outra instituição ou setor</Button>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="container">
        <p className={styles.erro} role="alert">
          {erroCarregamento.mensagem}
        </p>
      </section>
    );
  }

  const progresso =
    totalItensVisiveis === 0 ? 0 : Math.round((totalRespondidos / totalItensVisiveis) * 100);

  return (
    <section className={styles.secao}>
      <div className="container">
        <h1 className={styles.titulo}>Questionário</h1>
        <p className={styles.introducao}>
          Suas respostas continuam anônimas — nenhuma informação enviada aqui é associada a
          você.
        </p>

        <div className={styles.progresso}>
          <div className={styles.barraProgresso}>
            <div className={styles.barraProgressoPreenchida} style={{ width: `${progresso}%` }} />
          </div>
          <span className={styles.textoProgresso}>
            {totalRespondidos} de {totalItensVisiveis} respondidas
          </span>
        </div>

        <form onSubmit={handleEnviar}>
          {itensVisiveis.map((item) => (
            <fieldset key={item.id} className={styles.item}>
              <legend className={styles.textoItem}>{item.texto}</legend>
              <div className={styles.escala}>
                {Array.from(
                  { length: item.escala_max - item.escala_min + 1 },
                  (_, indice) => item.escala_min + indice
                ).map((valor) => (
                  <label key={valor} className={styles.opcaoEscala}>
                    <input
                      type="radio"
                      className={styles.inputEscala}
                      name={`item-${item.id}`}
                      value={valor}
                      checked={respostas[item.id] === valor}
                      onChange={() => handleRespostaItem(item.id, valor)}
                      required
                    />
                    <span className={styles.bolhaEscala}>{valor}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          {erroEnvio && (
            <p role="alert" className={styles.erro}>
              {erroEnvio}
            </p>
          )}

          <div className={styles.rodapeAcoes}>
            <Button type="submit" disabled={!todosVisiveisRespondidos || enviando}>
              {enviando ? "Enviando..." : "Enviar respostas"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
