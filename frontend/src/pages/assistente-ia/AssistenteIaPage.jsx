// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useState } from "react";

import * as adminApi from "../../api/admin";
import * as chatApi from "../../api/chat";
import * as consultorApi from "../../api/consultor";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { IconeExcluir } from "../../components/common/icones";
import { Button } from "../../components/forms/Button";
import { DropdownInstituicao } from "../../components/forms/DropdownInstituicao";
import formStyles from "../../components/forms/FormField.module.css";
import { useAuth } from "../../hooks/useAuth";
import { useChatAjuda } from "../../hooks/useChatAjuda";
import styles from "./AssistenteIaPage.module.css";

// Página reaproveitada nas duas rotas protegidas (/admin/assistente-ia e
// /consultor/assistente-ia — ver App.jsx, mesmo padrão de reuso de
// PerfilPage). O mesmo componente serve de histórico *e* de chat ao vivo
// (useChatAjuda) — não há duas telas separadas porque o histórico é
// exatamente a mesma lista de mensagens que a conversa em andamento.
export function AssistenteIaPage() {
  const { usuario, papel } = useAuth();
  const ehAdmin = papel === "administrador";

  const [instituicao, setInstituicao] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioAlvoId, setUsuarioAlvoId] = useState(""); // "" = próprias conversas

  useEffect(() => {
    if (ehAdmin) {
      adminApi.listarUsuarios().then(setUsuarios).catch(() => {});
    }
  }, [ehAdmin]);

  const usuarioAlvoIdNum = usuarioAlvoId ? Number(usuarioAlvoId) : undefined;
  // Só o Administrador pode escolher ver a conversa de outra pessoa — e,
  // quando escolhe, é modo leitura: não é lugar de mandar mensagem em
  // nome de outro usuário.
  const somenteLeitura = ehAdmin && usuarioAlvoIdNum !== undefined && usuarioAlvoIdNum !== usuario.id;

  const { mensagens, carregandoHistorico, enviando, erro, recarregar, enviar } = useChatAjuda({
    tela: ehAdmin ? "Assistente IA (Administrador)" : "Assistente IA (Consultor)",
    instituicaoId: instituicao?.id,
    usuarioId: usuarioAlvoIdNum,
    somenteLeitura,
  });

  const [mensagemAtual, setMensagemAtual] = useState("");
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [erroAcao, setErroAcao] = useState(null);

  async function handleEnviar(evento) {
    evento.preventDefault();
    const texto = mensagemAtual;
    setMensagemAtual("");
    await enviar(texto);
  }

  async function handleExportar() {
    setExportando(true);
    setErroAcao(null);
    try {
      const { blob, nomeArquivo } = await chatApi.exportarHistoricoCsv(usuarioAlvoIdNum);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (erroApi) {
      setErroAcao(erroApi.mensagem);
    } finally {
      setExportando(false);
    }
  }

  async function handleConfirmarExclusao() {
    setExcluindo(true);
    setErroAcao(null);
    try {
      await chatApi.excluirHistorico(usuarioAlvoIdNum);
      setConfirmarExclusao(false);
      recarregar();
    } catch (erroApi) {
      setErroAcao(erroApi.mensagem);
    } finally {
      setExcluindo(false);
    }
  }

  const usuarioAlvoNome = usuarioAlvoIdNum
    ? usuarios.find((u) => u.id === usuarioAlvoIdNum)?.nome
    : null;

  return (
    <section>
      <h1>Assistente IA</h1>
      <p className={styles.descricao}>
        Converse com o assistente sobre o sistema, questionários e os resultados
        {ehAdmin ? " das instituições cadastradas." : " das suas instituições vinculadas."}
        {ehAdmin && " Como Administrador, você também pode consultar, exportar e excluir o histórico de qualquer usuário."}
      </p>

      <div className={styles.filtros}>
        <DropdownInstituicao
          label={ehAdmin ? "Perguntar sobre a instituição" : "Perguntar sobre minha instituição"}
          value={instituicao?.id ?? null}
          onChange={setInstituicao}
          carregarInstituicoes={ehAdmin ? adminApi.listarInstituicoes : consultorApi.listarMinhasInstituicoes}
        />

        {ehAdmin && (
          <div className={formStyles.campo}>
            <label htmlFor="assistente-usuario-alvo" className={formStyles.rotulo}>
              Ver conversas de
            </label>
            <select
              id="assistente-usuario-alvo"
              className={formStyles.controle}
              value={usuarioAlvoId}
              onChange={(e) => setUsuarioAlvoId(e.target.value)}
            >
              <option value="">Minhas conversas</option>
              {usuarios
                .filter((u) => u.id !== usuario.id)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} ({u.papel})
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      <div className={styles.toolbar}>
        <Button
          type="button"
          variante="secundario"
          onClick={handleExportar}
          disabled={exportando || mensagens.length === 0}
        >
          {exportando ? "Exportando..." : "Exportar histórico"}
        </Button>
        <Button
          type="button"
          variante="perigo"
          onClick={() => setConfirmarExclusao(true)}
          disabled={mensagens.length === 0}
        >
          <IconeExcluir className={styles.iconeBotao} /> Excluir histórico
        </Button>
      </div>

      {erroAcao && (
        <p role="alert" className={styles.erro}>
          {erroAcao}
        </p>
      )}

      <div className={styles.painelChat}>
        <div className={styles.listaMensagens} aria-live="polite">
          {carregandoHistorico && <p className={styles.mensagemVazia}>Carregando histórico...</p>}
          {!carregandoHistorico && mensagens.length === 0 && (
            <p className={styles.mensagemVazia}>
              {somenteLeitura
                ? `${usuarioAlvoNome} ainda não conversou com o assistente.`
                : "Pergunte sobre questionários, resultados, k-anonimato, planos de ação ou como usar o sistema."}
            </p>
          )}
          {mensagens.map((mensagem, indice) => (
            <div
              key={`${mensagem.criado_em}-${indice}`}
              className={`${styles.mensagem} ${
                mensagem.papel === "usuario" ? styles.mensagemUsuario : styles.mensagemAssistente
              }`}
            >
              {mensagem.conteudo}
            </div>
          ))}
          {enviando && <p className={styles.digitando}>Digitando...</p>}
        </div>

        {erro && (
          <p role="alert" className={styles.erro}>
            {erro}
          </p>
        )}

        {somenteLeitura ? (
          <p className={styles.avisoSomenteLeitura}>
            Visualizando a conversa de <strong>{usuarioAlvoNome}</strong> — somente leitura.
          </p>
        ) : (
          <form className={styles.formulario} onSubmit={handleEnviar}>
            <label htmlFor="assistente-input" className={styles.rotuloOculto}>
              Digite sua pergunta
            </label>
            <input
              id="assistente-input"
              type="text"
              className={formStyles.controle}
              value={mensagemAtual}
              onChange={(e) => setMensagemAtual(e.target.value)}
              placeholder="Digite sua pergunta..."
              disabled={enviando}
              maxLength={4000}
            />
            <Button type="submit" disabled={enviando || !mensagemAtual.trim()}>
              Enviar
            </Button>
          </form>
        )}
      </div>

      <ConfirmModal
        aberto={confirmarExclusao}
        titulo="Excluir histórico de conversas"
        perigo
        confirmando={excluindo}
        onConfirmar={handleConfirmarExclusao}
        onCancelar={() => setConfirmarExclusao(false)}
      >
        <p>
          {usuarioAlvoNome ? (
            <>
              Isso vai excluir <strong>todas</strong> as conversas de{" "}
              <strong>{usuarioAlvoNome}</strong> com o assistente — não as suas. Essa
              ação não pode ser desfeita.
            </>
          ) : (
            "Isso vai excluir todas as suas conversas com o assistente. Essa ação não pode ser desfeita."
          )}
        </p>
      </ConfirmModal>
    </section>
  );
}
