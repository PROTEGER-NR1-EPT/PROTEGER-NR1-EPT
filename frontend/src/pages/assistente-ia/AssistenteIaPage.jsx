// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useState } from "react";

import * as adminApi from "../../api/admin";
import * as chatApi from "../../api/chat";
import * as consultorApi from "../../api/consultor";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { IconeExcluir } from "../../components/common/icones";
import { BotaoIcone } from "../../components/common/BotaoIcone";
import { Button } from "../../components/forms/Button";
import { DropdownInstituicao } from "../../components/forms/DropdownInstituicao";
import formStyles from "../../components/forms/FormField.module.css";
import { useAuth } from "../../hooks/useAuth";
import { useChatAjuda } from "../../hooks/useChatAjuda";
import styles from "./AssistenteIaPage.module.css";

function dispararDownload(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Página reaproveitada nas duas rotas protegidas (/admin/assistente-ia e
// /consultor/assistente-ia — ver App.jsx, mesmo padrão de reuso de
// PerfilPage). Cada usuário pode ter várias conversas distintas (sidebar,
// estilo ChatGPT) — o painel principal serve de histórico *e* de chat ao
// vivo (useChatAjuda) da conversa selecionada.
export function AssistenteIaPage() {
  const { usuario, papel } = useAuth();
  const ehAdmin = papel === "administrador";

  const [instituicao, setInstituicao] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioAlvoId, setUsuarioAlvoId] = useState(""); // "" = próprias conversas

  const [conversas, setConversas] = useState([]);
  const [carregandoConversas, setCarregandoConversas] = useState(true);
  const [conversaId, setConversaId] = useState(null); // null = nenhuma selecionada ainda

  useEffect(() => {
    if (ehAdmin) {
      adminApi.listarUsuarios().then(setUsuarios).catch(() => {});
    }
  }, [ehAdmin]);

  const usuarioAlvoIdNum = usuarioAlvoId ? Number(usuarioAlvoId) : undefined;
  // Só o Administrador pode escolher ver as conversas de outra pessoa — e,
  // quando escolhe, é modo leitura: não é lugar de mandar mensagem (nem
  // criar/excluir conversa) em nome de outro usuário.
  const somenteLeitura = ehAdmin && usuarioAlvoIdNum !== undefined && usuarioAlvoIdNum !== usuario.id;

  // Recarrega a lista de conversas sempre que troca de usuário auditado —
  // e seleciona a mais recente automaticamente (mesmo comportamento de
  // "abrir no último chat" do ChatGPT).
  useEffect(() => {
    setCarregandoConversas(true);
    chatApi
      .listarConversas(usuarioAlvoIdNum)
      .then((dados) => {
        setConversas(dados.conversas);
        setConversaId(dados.conversas[0]?.id ?? null);
      })
      .catch(() => {})
      .finally(() => setCarregandoConversas(false));
  }, [usuarioAlvoIdNum]);

  const { mensagens, carregandoHistorico, enviando, erro, enviar } = useChatAjuda({
    tela: ehAdmin ? "Assistente IA (Administrador)" : "Assistente IA (Consultor)",
    instituicaoId: instituicao?.id,
    usuarioId: usuarioAlvoIdNum,
    conversaId: conversaId ?? undefined,
    somenteLeitura,
    autoCarregar: conversaId != null,
  });

  const [mensagemAtual, setMensagemAtual] = useState("");
  const [conversaParaExcluir, setConversaParaExcluir] = useState(null); // { id, titulo } | null
  const [excluindoConversa, setExcluindoConversa] = useState(false);
  const [confirmarExclusaoTudo, setConfirmarExclusaoTudo] = useState(false);
  const [excluindoTudo, setExcluindoTudo] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [erroAcao, setErroAcao] = useState(null);

  function handleTrocarUsuarioAlvo(evento) {
    setUsuarioAlvoId(evento.target.value);
    setConversaId(null); // evita usar um conversaId que não pertence ao novo alvo
  }

  async function handleEnviar(evento) {
    evento.preventDefault();
    const texto = mensagemAtual;
    setMensagemAtual("");
    await enviar(texto);
    // A 1ª mensagem gera o título da conversa no backend (mesmo corte de
    // 50 chars de _gerar_titulo em services/chat_ia.py) e "atualizado_em"
    // avança — replica isso localmente pra sidebar não ficar com "Nova
    // conversa"/ordem desatualizada até um reload, sem round-trip extra.
    const agora = new Date().toISOString();
    setConversas((atual) =>
      [...atual]
        .map((c) => {
          if (c.id !== conversaId) return c;
          const limpo = texto.replace(/\s+/g, " ").trim();
          const tituloGerado = limpo.length > 50 ? `${limpo.slice(0, 50).trimEnd()}…` : limpo;
          return {
            ...c,
            titulo: c.titulo ?? tituloGerado,
            quantidade_mensagens: c.quantidade_mensagens + 2,
            atualizado_em: agora,
          };
        })
        .sort((a, b) => new Date(b.atualizado_em) - new Date(a.atualizado_em))
    );
  }

  async function handleNovaConversa() {
    setErroAcao(null);
    try {
      const nova = await chatApi.criarConversa();
      // Conversas vazias não aparecem em GET /chat/conversas (só depois
      // da 1ª mensagem) — adiciona localmente pra já mostrar selecionada.
      setConversas((atual) => [nova, ...atual]);
      setConversaId(nova.id);
    } catch (erroApi) {
      setErroAcao(erroApi.mensagem);
    }
  }

  async function handleConfirmarExclusaoConversa() {
    setExcluindoConversa(true);
    setErroAcao(null);
    try {
      await chatApi.excluirConversa(conversaParaExcluir.id, usuarioAlvoIdNum);
      const restantes = conversas.filter((c) => c.id !== conversaParaExcluir.id);
      setConversas(restantes);
      if (conversaId === conversaParaExcluir.id) {
        setConversaId(restantes[0]?.id ?? null);
      }
      setConversaParaExcluir(null);
    } catch (erroApi) {
      setErroAcao(erroApi.mensagem);
    } finally {
      setExcluindoConversa(false);
    }
  }

  async function handleExportarConversaAtual() {
    if (!conversaId) return;
    setExportando(true);
    setErroAcao(null);
    try {
      const { blob, nomeArquivo } = await chatApi.exportarConversaCsv(conversaId, usuarioAlvoIdNum);
      dispararDownload(blob, nomeArquivo);
    } catch (erroApi) {
      setErroAcao(erroApi.mensagem);
    } finally {
      setExportando(false);
    }
  }

  async function handleConfirmarExclusaoTudo() {
    setExcluindoTudo(true);
    setErroAcao(null);
    try {
      await chatApi.excluirHistorico(usuarioAlvoIdNum);
      setConversas([]);
      setConversaId(null);
      setConfirmarExclusaoTudo(false);
    } catch (erroApi) {
      setErroAcao(erroApi.mensagem);
    } finally {
      setExcluindoTudo(false);
    }
  }

  const usuarioAlvoNome = usuarioAlvoIdNum
    ? usuarios.find((u) => u.id === usuarioAlvoIdNum)?.nome
    : null;
  const conversaAtual = conversas.find((c) => c.id === conversaId) ?? null;

  return (
    <section className={styles.pagina}>
      <div className={styles.cabecalhoPagina}>
        <div>
          <h1 className={styles.titulo}>Assistente IA</h1>
          <p className={styles.descricao}>
            Converse sobre o sistema, questionários e os resultados
            {ehAdmin ? " das instituições cadastradas." : " das suas instituições vinculadas."}
            {ehAdmin && " Como Administrador, você também audita as conversas de qualquer usuário."}
          </p>
        </div>

        {ehAdmin && (
          <div className={formStyles.campo} style={{ maxWidth: "18rem" }}>
            <label htmlFor="assistente-usuario-alvo" className={formStyles.rotulo}>
              Ver conversas de
            </label>
            <select
              id="assistente-usuario-alvo"
              className={formStyles.controle}
              value={usuarioAlvoId}
              onChange={handleTrocarUsuarioAlvo}
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

      {erroAcao && (
        <p role="alert" className={styles.erro}>
          {erroAcao}
        </p>
      )}

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <Button
            type="button"
            variante="secundario"
            onClick={handleNovaConversa}
            disabled={somenteLeitura}
            className={styles.botaoNovaConversa}
          >
            <IconeMais className={styles.iconePequeno} /> Nova conversa
          </Button>

          <ul className={styles.listaConversas}>
            {carregandoConversas && <li className={styles.mensagemVazia}>Carregando...</li>}
            {!carregandoConversas && conversas.length === 0 && (
              <li className={styles.mensagemVazia}>Nenhuma conversa ainda.</li>
            )}
            {conversas.map((c) => (
              <li key={c.id} className={c.id === conversaId ? styles.itemSelecionado : undefined}>
                <button
                  type="button"
                  className={styles.itemConversa}
                  onClick={() => setConversaId(c.id)}
                >
                  <span className={styles.tituloConversa}>{c.titulo || "Nova conversa"}</span>
                  <span className={styles.dataConversa}>
                    {new Date(c.atualizado_em).toLocaleDateString("pt-BR")}
                  </span>
                </button>
                {!somenteLeitura && (
                  <button
                    type="button"
                    className={styles.botaoExcluirItem}
                    aria-label={`Excluir conversa "${c.titulo || "sem título"}"`}
                    onClick={() => setConversaParaExcluir(c)}
                  >
                    <IconeExcluir className={styles.iconePequeno} />
                  </button>
                )}
              </li>
            ))}
          </ul>

          {!somenteLeitura && conversas.length > 0 && (
            <button
              type="button"
              className={styles.linkExcluirTudo}
              onClick={() => setConfirmarExclusaoTudo(true)}
            >
              Excluir todas as conversas
            </button>
          )}
        </aside>

        <div className={styles.painelPrincipal}>
          <div className={styles.cabecalhoChat}>
            <DropdownInstituicao
              label={ehAdmin ? "Perguntar sobre a instituição" : "Perguntar sobre minha instituição"}
              value={instituicao?.id ?? null}
              onChange={setInstituicao}
              carregarInstituicoes={ehAdmin ? adminApi.listarInstituicoes : consultorApi.listarMinhasInstituicoes}
            />
            <div className={styles.grupoAcoes}>
              <BotaoIcone
                icone={IconeExportar}
                rotulo={exportando ? "Exportando..." : "Exportar esta conversa"}
                onClick={handleExportarConversaAtual}
                disabled={exportando || !conversaId}
              />
              <BotaoIcone
                icone={IconeExcluir}
                rotulo="Excluir esta conversa"
                onClick={() => conversaAtual && setConversaParaExcluir(conversaAtual)}
                disabled={!conversaId}
              />
            </div>
          </div>

          <div className={styles.painelChat}>
            <div className={styles.listaMensagens} aria-live="polite">
              {!conversaId && !carregandoConversas && (
                <p className={styles.mensagemVazia}>
                  {somenteLeitura
                    ? `${usuarioAlvoNome} ainda não tem conversas com o assistente.`
                    : 'Selecione uma conversa ao lado ou clique em "Nova conversa".'}
                </p>
              )}
              {conversaId && carregandoHistorico && (
                <p className={styles.mensagemVazia}>Carregando conversa...</p>
              )}
              {conversaId && !carregandoHistorico && mensagens.length === 0 && (
                <p className={styles.mensagemVazia}>
                  Pergunte sobre questionários, resultados, k-anonimato, planos de ação ou
                  como usar o sistema.
                </p>
              )}
              {mensagens.map((mensagem, indice) =>
                mensagem.papel === "usuario" ? (
                  <div key={`${mensagem.criado_em}-${indice}`} className={styles.mensagemUsuario}>
                    {mensagem.conteudo}
                  </div>
                ) : (
                  <div key={`${mensagem.criado_em}-${indice}`} className={styles.linhaAssistente}>
                    <span className={styles.avatarAssistente} aria-hidden="true">
                      IA
                    </span>
                    <p className={styles.textoAssistente}>{mensagem.conteudo}</p>
                  </div>
                )
              )}
              {enviando && (
                <div className={styles.linhaAssistente}>
                  <span className={styles.avatarAssistente} aria-hidden="true">
                    IA
                  </span>
                  <p className={styles.digitando}>Digitando...</p>
                </div>
              )}
            </div>

            {erro && (
              <p role="alert" className={styles.erro}>
                {erro}
              </p>
            )}

            {somenteLeitura ? (
              conversaId && (
                <p className={styles.avisoSomenteLeitura}>
                  Visualizando a conversa de <strong>{usuarioAlvoNome}</strong> — somente leitura.
                </p>
              )
            ) : (
              <form className={styles.formulario} onSubmit={handleEnviar}>
                <label htmlFor="assistente-input" className={styles.rotuloOculto}>
                  Digite sua pergunta
                </label>
                <input
                  id="assistente-input"
                  type="text"
                  className={styles.composerInput}
                  value={mensagemAtual}
                  onChange={(e) => setMensagemAtual(e.target.value)}
                  placeholder={conversaId ? "Digite sua pergunta..." : "Crie ou selecione uma conversa para começar"}
                  disabled={enviando || !conversaId}
                  maxLength={4000}
                />
                <button
                  type="submit"
                  className={styles.composerBotaoEnviar}
                  aria-label="Enviar"
                  disabled={enviando || !conversaId || !mensagemAtual.trim()}
                >
                  <IconeEnviar className={styles.iconePequeno} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        aberto={conversaParaExcluir !== null}
        titulo="Excluir conversa"
        perigo
        confirmando={excluindoConversa}
        onConfirmar={handleConfirmarExclusaoConversa}
        onCancelar={() => setConversaParaExcluir(null)}
      >
        <p>
          Isso vai excluir a conversa "{conversaParaExcluir?.titulo || "sem título"}"
          {usuarioAlvoNome ? (
            <>
              {" "}
              de <strong>{usuarioAlvoNome}</strong> — não uma sua
            </>
          ) : null}
          . Essa ação não pode ser desfeita.
        </p>
      </ConfirmModal>

      <ConfirmModal
        aberto={confirmarExclusaoTudo}
        titulo="Excluir todas as conversas"
        perigo
        confirmando={excluindoTudo}
        onConfirmar={handleConfirmarExclusaoTudo}
        onCancelar={() => setConfirmarExclusaoTudo(false)}
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

function IconeMais({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconeExportar({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M12 3v12M7 10l5 5 5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 19h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconeEnviar({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M4 12h16M13 5l7 7-7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
