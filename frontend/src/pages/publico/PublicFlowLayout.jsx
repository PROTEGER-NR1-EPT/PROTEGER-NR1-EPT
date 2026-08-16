import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";

/**
 * Não estava na lista de arquivos pedida, mas é necessário: LandingPage,
 * TclePage, QuestionarioPage e ConfirmacaoPage precisam compartilhar a
 * instituição/setor escolhidos sem esse estado morar em localStorage
 * (proibido para dados de sessão) nem em um Context global (essa seleção
 * só faz sentido durante o fluxo de resposta, não no app inteiro). Um
 * layout route com <Outlet context> resolve isso sem criar rotas novas
 * nem redesenhar a árvore de navegação (regra 3 do prompt).
 *
 * Ao atualizar a página no meio do fluxo, este estado se perde de
 * propósito (é só estado de aplicação) — cada página consumidora trata
 * isso redirecionando de volta para "/participar" (início do fluxo de
 * resposta) quando os dados esperados não estão presentes.
 */
export function PublicFlowLayout() {
  const [instituicao, setInstituicao] = useState(null);
  const [setor, setSetor] = useState(null);
  const [questionario, setQuestionario] = useState(null);

  const limparFluxo = useCallback(() => {
    setInstituicao(null);
    setSetor(null);
    setQuestionario(null);
  }, []);

  return (
    <Outlet
      context={{
        instituicao,
        setInstituicao,
        setor,
        setSetor,
        questionario,
        setQuestionario,
        limparFluxo,
      }}
    />
  );
}
