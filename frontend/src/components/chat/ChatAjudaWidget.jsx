// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { useChatAjuda } from "../../hooks/useChatAjuda";
import { Button } from "../forms/Button";
import styles from "./ChatAjudaWidget.module.css";

// Nomes legíveis das telas autenticadas (App.jsx) — mandados ao backend a
// cada mensagem só como contexto para a IA responder considerando onde o
// usuário está (nunca persistidos no histórico). Rotas não listadas aqui
// (públicas, /login) não importam: o widget só é montado para quem está
// logado como Consultor/Administrador (ver Header.jsx).
function nomeTelaAtual(pathname) {
  if (pathname === "/consultor") return "Dashboard do Consultor";
  if (pathname.startsWith("/consultor/instituicoes/")) {
    return "Resultados da instituição (Consultor)";
  }
  if (pathname === "/consultor/planos-acao") return "Planos de Ação (Consultor)";
  if (pathname === "/consultor/assistente-ia") return "Assistente IA (Consultor)";
  if (pathname === "/consultor/perfil") return "Perfil (Consultor)";

  if (pathname === "/admin") return "Dashboard do Administrador";
  if (pathname === "/admin/resultados") return "Resultados (Administrador)";
  if (pathname === "/admin/planos-acao") return "Planos de Ação (Administrador)";
  if (pathname === "/admin/instituicoes") return "Instituições (Administrador)";
  if (pathname === "/admin/questionarios") return "Questionários (Administrador)";
  if (pathname === "/admin/usuarios") return "Usuários (Administrador)";
  if (pathname === "/admin/configuracoes") return "Configurações do sistema (Administrador)";
  if (pathname === "/admin/exportacao") return "Exportação de dados (Administrador)";
  if (pathname === "/admin/logs") return "Log de atividade (Administrador)";
  if (pathname === "/admin/assistente-ia") return "Assistente IA (Administrador)";
  if (pathname === "/admin/perfil") return "Perfil (Administrador)";

  return null;
}

// Ícone flutuante no canto inferior direito (o de acessibilidade já ocupa o
// canto superior direito — ver AcessibilidadeWidget.jsx) que abre um painel
// de chat com o assistente de ajuda contextual, configurado pelo
// Administrador em /admin/configuracoes. Mesmo padrão de
// abrir/fechar/acessibilidade do AcessibilidadeWidget.jsx. Estado e envio
// de mensagens vêm do hook useChatAjuda, reaproveitado também pela página
// dedicada "Assistente IA" (pages/assistente-ia/AssistenteIaPage.jsx).
export function ChatAjudaWidget() {
  const { pathname } = useLocation();
  const [aberto, setAberto] = useState(false);
  const [mensagemAtual, setMensagemAtual] = useState("");
  const painelRef = useRef(null);
  const botaoRef = useRef(null);
  const listaRef = useRef(null);

  const { mensagens, carregandoHistorico, enviando, erro, enviar } = useChatAjuda({
    tela: nomeTelaAtual(pathname),
    autoCarregar: aberto,
  });

  useEffect(() => {
    if (!aberto) return;

    function handlePointerDown(evento) {
      if (
        painelRef.current &&
        !painelRef.current.contains(evento.target) &&
        !botaoRef.current.contains(evento.target)
      ) {
        setAberto(false);
      }
    }

    function handleKeyDown(evento) {
      if (evento.key === "Escape") {
        setAberto(false);
        botaoRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [aberto]);

  useEffect(() => {
    if (listaRef.current) {
      listaRef.current.scrollTop = listaRef.current.scrollHeight;
    }
  }, [mensagens, enviando]);

  function fechar() {
    setAberto(false);
    botaoRef.current?.focus();
  }

  async function handleEnviar(evento) {
    evento.preventDefault();
    const texto = mensagemAtual;
    setMensagemAtual("");
    await enviar(texto);
  }

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        className={styles.botaoFlutuante}
        onClick={() => setAberto((atual) => !atual)}
        aria-expanded={aberto}
        aria-haspopup="true"
        aria-controls="painel-chat-ajuda"
        aria-label="Abrir chat de ajuda"
      >
        <IconeChat />
        <span className={styles.dica} aria-hidden="true">
          Chat de ajuda
        </span>
      </button>

      {aberto && (
        <div
          id="painel-chat-ajuda"
          ref={painelRef}
          role="region"
          aria-label="Chat de ajuda"
          className={styles.painel}
        >
          <div className={styles.cabecalhoPainel}>
            <h2 className={styles.tituloPainel}>Chat de ajuda</h2>
            <button
              type="button"
              className={styles.botaoFechar}
              onClick={fechar}
              aria-label="Fechar chat de ajuda"
            >
              ×
            </button>
          </div>

          <div className={styles.corpoPainel}>
            <div ref={listaRef} className={styles.listaMensagens} aria-live="polite">
              {carregandoHistorico && (
                <p className={styles.mensagemVazia}>Carregando histórico...</p>
              )}
              {!carregandoHistorico && mensagens.length === 0 && (
                <p className={styles.mensagemVazia}>
                  Pergunte sobre questionários, resultados, k-anonimato, planos de
                  ação ou como usar o sistema.
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

            <form className={styles.formulario} onSubmit={handleEnviar}>
              <label htmlFor="chat-ajuda-input" className={styles.rotuloOculto}>
                Digite sua pergunta
              </label>
              <input
                id="chat-ajuda-input"
                type="text"
                className={styles.campoTexto}
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
          </div>
        </div>
      )}
    </>
  );
}

function IconeChat() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icone} aria-hidden="true" focusable="false">
      <path
        d="M4 4h16v11H8l-4 4V4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
