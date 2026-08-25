// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import * as adminApi from "../../api/admin";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { PageHeader } from "../../components/common/PageHeader";
import { Button } from "../../components/forms/Button";
import { DropdownInstituicao } from "../../components/forms/DropdownInstituicao";
import { DropdownSetor } from "../../components/forms/DropdownSetor";
import formStyles from "../../components/forms/FormField.module.css";
import { useAuth } from "../../hooks/useAuth";
import tabela from "../../styles/tabela.module.css";
import styles from "./ConfiguracoesPage.module.css";

const FRASE_CONFIRMACAO_RESET = "RESETAR SISTEMA";

// Mesmo padrão de pages/assistente-ia/AssistenteIaPage.jsx:dispararDownload
// — reaproveitado pelos 6 blocos de exportação desta aba.
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

function IconeEscudo({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeIA({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeAcessibilidade({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <circle cx="12" cy="5" r="2" fill="currentColor" />
      <path
        d="M5 9h14M12 9v6M12 15l-4 6M12 15l4 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeConexao({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M9 3v4M15 3v4M6 7h12v3a6 6 0 0 1-12 0V7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 16v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Mesmo desenho de AdminLayout.jsx antes de "Exportação de dados"/"Log de
// atividade" saírem do menu principal e virarem abas aqui.
function IconeExportacao({ className }) {
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

function IconeLogs({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 7v5l3.5 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconePerigo({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M12 3l10 18H2L12 3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 10v4M12 17h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Abas de config propriamente ditas (salvas juntas por handleSalvar, num
// único <form>) — Exportação/Logs/Resetar entraram depois, mas não fazem
// parte desse form (ver comentário em ABAS_FORM_CONFIG mais abaixo).
const ABAS = [
  { valor: "k-anonimato", rotulo: "k-anonimato" },
  { valor: "ia", rotulo: "Recursos de IA" },
  { valor: "llm", rotulo: "Provedor LLM" },
  { valor: "acessibilidade", rotulo: "Acessibilidade" },
  { valor: "exportacao", rotulo: "Exportação de dados" },
  { valor: "logs", rotulo: "Log de atividade" },
  { valor: "reset", rotulo: "Resetar sistema" },
];

// Exportação (tem seu próprio formulário/botão), Logs (não tem
// formulário, só filtro+tabela) e Resetar (tem seu próprio modal de
// confirmação) não podem ficar dentro do <form onSubmit={handleSalvar}>
// das configurações de fato — o form inteiro (incluindo o botão "Salvar
// configurações") fica oculto nessas três abas.
const ABAS_FORM_CONFIG = ["k-anonimato", "ia", "llm", "acessibilidade"];

// Base URLs oficiais (documentação de cada provedor) para o endpoint
// compatível com OpenAI — preenchidas automaticamente ao trocar de
// provedor, só para facilitar; o Administrador pode sobrescrever depois.
const BASE_URLS_PROVEDOR = {
  anthropic: "https://api.anthropic.com/v1/",
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
  openrouter: "https://openrouter.ai/api/v1",
  nvidia_build: "https://integrate.api.nvidia.com/v1",
  cohere: "https://api.cohere.ai/compatibility/v1",
};

// Sugestão inicial de modelo por provedor — nomes de modelo mudam com mais
// frequência que as Base URLs (sobretudo em OpenRouter/NVIDIA Build, cujos
// slugs dependem do catálogo disponível na conta), por isso é só um ponto
// de partida: preenchida automaticamente ao trocar de provedor, sempre
// editável pelo Administrador.
const MODELOS_PROVEDOR = {
  anthropic: "claude-sonnet-5",
  openai: "gpt-4o-mini",
  gemini: "gemini-2.5-flash",
  openrouter: "openai/gpt-4o-mini",
  nvidia_build: "meta/llama-3.1-8b-instruct",
  cohere: "command-a-03-2025",
};

export function ConfiguracoesPage() {
  const navigate = useNavigate();
  const { sair } = useAuth();

  const [config, setConfig] = useState(null);
  const [novaChaveApi, setNovaChaveApi] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState("k-anonimato");

  // --- Exportação de dados (ex-ExportacaoPage.jsx) ------------------------
  const [instituicaoExportacao, setInstituicaoExportacao] = useState(null);
  const [setorExportacao, setSetorExportacao] = useState(null);
  const [questionarioIdExportacao, setQuestionarioIdExportacao] = useState("");
  const [questionariosExportacao, setQuestionariosExportacao] = useState([]);
  const [confirmadoExportacao, setConfirmadoExportacao] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [erroExportacao, setErroExportacao] = useState(null);
  const [mensagemExportacao, setMensagemExportacao] = useState(null);

  // --- Exportação: Visão geral (PDF) --------------------------------------
  const [exportandoEstatisticas, setExportandoEstatisticas] = useState(false);
  const [erroEstatisticasExport, setErroEstatisticasExport] = useState(null);

  // --- Exportação: Resultados (dashboard, CSV) ----------------------------
  const [instituicaoResultadosExport, setInstituicaoResultadosExport] = useState(null);
  const [setorResultadosExport, setSetorResultadosExport] = useState(null);
  const [questionarioIdResultadosExport, setQuestionarioIdResultadosExport] = useState("");
  const [instrumentoResultadosExport, setInstrumentoResultadosExport] = useState("");
  const [exportandoResultados, setExportandoResultados] = useState(false);
  const [erroResultadosExport, setErroResultadosExport] = useState(null);

  // --- Exportação: Resultados do Consultor (por instituição, CSV) ---------
  const [instituicaoResultadosConsultorExport, setInstituicaoResultadosConsultorExport] = useState(null);
  const [setorResultadosConsultorExport, setSetorResultadosConsultorExport] = useState(null);
  const [exportandoResultadosConsultor, setExportandoResultadosConsultor] = useState(false);
  const [erroResultadosConsultorExport, setErroResultadosConsultorExport] = useState(null);

  // --- Exportação: Planos de Ação (por instituição, CSV) ------------------
  const [instituicaoPlanosExport, setInstituicaoPlanosExport] = useState(null);
  const [exportandoPlanos, setExportandoPlanos] = useState(false);
  const [erroPlanosExport, setErroPlanosExport] = useState(null);

  // --- Exportação: Questionários (CSV) -------------------------------------
  const [exportandoQuestionarios, setExportandoQuestionarios] = useState(false);
  const [erroQuestionariosExport, setErroQuestionariosExport] = useState(null);

  // --- Log de atividade (ex-LogsPage.jsx) ---------------------------------
  const [logs, setLogs] = useState([]);
  const [usuariosLogs, setUsuariosLogs] = useState([]);
  const [usuarioIdLogs, setUsuarioIdLogs] = useState("");
  const [acaoLogs, setAcaoLogs] = useState("");
  const [carregandoLogs, setCarregandoLogs] = useState(true);
  const [erroLogs, setErroLogs] = useState(null);

  // --- Resetar sistema -----------------------------------------------------
  const [mostrarModalReset, setMostrarModalReset] = useState(false);
  const [fraseReset, setFraseReset] = useState("");
  const [senhaAtualReset, setSenhaAtualReset] = useState("");
  const [resetando, setResetando] = useState(false);
  const [erroReset, setErroReset] = useState(null);

  function handleAbrirModalReset() {
    setFraseReset("");
    setSenhaAtualReset("");
    setErroReset(null);
    setMostrarModalReset(true);
  }

  async function handleConfirmarReset() {
    if (fraseReset !== FRASE_CONFIRMACAO_RESET) {
      setErroReset(`Digite exatamente "${FRASE_CONFIRMACAO_RESET}" para confirmar.`);
      return;
    }
    if (!senhaAtualReset) {
      setErroReset("Informe sua senha atual.");
      return;
    }
    setResetando(true);
    setErroReset(null);
    try {
      await adminApi.resetarSistema(fraseReset, senhaAtualReset);
      // O reset revoga todas as sessões, inclusive a desta — sair() já
      // tolera o token não valer mais no servidor (try/finally em
      // AuthContext.jsx) e limpa o estado local antes de redirecionar.
      await sair();
      navigate("/login", {
        replace: true,
        state: { mensagem: "Sistema resetado com sucesso. Faça login novamente." },
      });
    } catch (erroApi) {
      setErroReset(erroApi.mensagem);
    } finally {
      setResetando(false);
    }
  }

  useEffect(() => {
    adminApi
      .obterConfiguracoes()
      .then(setConfig)
      .catch((erroApi) => setErro(erroApi.mensagem))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    adminApi.listarQuestionarios().then(setQuestionariosExportacao).catch(() => {});
  }, []);

  useEffect(() => {
    adminApi.listarUsuarios().then(setUsuariosLogs).catch(() => {});
  }, []);

  useEffect(() => {
    setCarregandoLogs(true);
    adminApi
      .listarLogs({ usuario_id: usuarioIdLogs || undefined, acao: acaoLogs || undefined })
      .then(setLogs)
      .catch((erroApi) => setErroLogs(erroApi.mensagem))
      .finally(() => setCarregandoLogs(false));
  }, [usuarioIdLogs, acaoLogs]);

  // Nunca dispara a exportação sozinha ao entrar na tela (regra 5) — só
  // roda quando o Administrador clica no botão, depois de marcar o
  // checkbox de confirmação.
  async function handleExportar(evento) {
    evento.preventDefault();
    if (!confirmadoExportacao) return;
    setExportando(true);
    setErroExportacao(null);
    setMensagemExportacao(null);
    try {
      const { blob, nomeArquivo } = await adminApi.exportarRespostasCsv({
        instituicaoId: instituicaoExportacao?.id,
        setorId: setorExportacao?.id,
        questionarioId: questionarioIdExportacao || undefined,
      });
      dispararDownload(blob, nomeArquivo);
      setMensagemExportacao("Exportação concluída — verifique os downloads do navegador.");
      setConfirmadoExportacao(false);
    } catch (erroApi) {
      setErroExportacao(erroApi.mensagem);
    } finally {
      setExportando(false);
    }
  }

  async function handleExportarEstatisticas() {
    setExportandoEstatisticas(true);
    setErroEstatisticasExport(null);
    try {
      const { blob, nomeArquivo } = await adminApi.exportarEstatisticasPdf();
      dispararDownload(blob, nomeArquivo);
    } catch (erroApi) {
      setErroEstatisticasExport(erroApi.mensagem);
    } finally {
      setExportandoEstatisticas(false);
    }
  }

  async function handleExportarResultados() {
    setExportandoResultados(true);
    setErroResultadosExport(null);
    try {
      const { blob, nomeArquivo } = await adminApi.exportarResultadosCsv({
        instituicaoId: instituicaoResultadosExport?.id,
        setorId: setorResultadosExport?.id,
        questionarioId: questionarioIdResultadosExport || undefined,
        instrumento: instrumentoResultadosExport || undefined,
      });
      dispararDownload(blob, nomeArquivo);
    } catch (erroApi) {
      setErroResultadosExport(erroApi.mensagem);
    } finally {
      setExportandoResultados(false);
    }
  }

  async function handleExportarResultadosInstituicao() {
    if (!instituicaoResultadosConsultorExport) return;
    setExportandoResultadosConsultor(true);
    setErroResultadosConsultorExport(null);
    try {
      const { blob, nomeArquivo } = await adminApi.exportarResultadosInstituicaoCsv(
        instituicaoResultadosConsultorExport.id,
        setorResultadosConsultorExport?.id
      );
      dispararDownload(blob, nomeArquivo);
    } catch (erroApi) {
      setErroResultadosConsultorExport(erroApi.mensagem);
    } finally {
      setExportandoResultadosConsultor(false);
    }
  }

  async function handleExportarPlanos() {
    if (!instituicaoPlanosExport) return;
    setExportandoPlanos(true);
    setErroPlanosExport(null);
    try {
      const { blob, nomeArquivo } = await adminApi.exportarPlanosCsv(instituicaoPlanosExport.id);
      dispararDownload(blob, nomeArquivo);
    } catch (erroApi) {
      setErroPlanosExport(erroApi.mensagem);
    } finally {
      setExportandoPlanos(false);
    }
  }

  async function handleExportarQuestionarios() {
    setExportandoQuestionarios(true);
    setErroQuestionariosExport(null);
    try {
      const { blob, nomeArquivo } = await adminApi.exportarQuestionariosCsv();
      dispararDownload(blob, nomeArquivo);
    } catch (erroApi) {
      setErroQuestionariosExport(erroApi.mensagem);
    } finally {
      setExportandoQuestionarios(false);
    }
  }

  async function handleSalvar(evento) {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    setMensagem(null);
    try {
      const alteracoes = {
        k_anonimato_threshold: config.k_anonimato_threshold,
        ia_sugestao_questionario_enabled: config.ia_sugestao_questionario_enabled,
        ia_analise_resultados_enabled: config.ia_analise_resultados_enabled,
        ia_chat_enabled: config.ia_chat_enabled,
        acessibilidade_widget_enabled: config.acessibilidade_widget_enabled,
        llm_provider: config.llm_provider,
        llm_base_url: config.llm_base_url,
        llm_model: config.llm_model,
      };
      // Só envia a chave se o Administrador digitou uma nova — nunca
      // sobrescreve com vazio, e a API nunca devolve a chave salva para
      // pré-preencher este campo (ver ConfiguracoesResponse no backend).
      if (novaChaveApi) {
        alteracoes.llm_api_key = novaChaveApi;
      }
      await adminApi.atualizarConfiguracoes(alteracoes);
      setNovaChaveApi("");
      setConfig(await adminApi.obterConfiguracoes());
      setMensagem("Configurações salvas com sucesso.");
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <p>Carregando...</p>;
  if (!config) return <p role="alert">{erro}</p>;

  const nenhumRecursoIaAtivo =
    !config.ia_sugestao_questionario_enabled &&
    !config.ia_analise_resultados_enabled &&
    !config.ia_chat_enabled;

  return (
    <section>
      <PageHeader titulo="Configurações do sistema">
        <p>
          Ajustes globais que afetam o sistema inteiro, organizados em
          abas. A maioria fica só sob efeito depois de clicar em "Salvar
          configurações" no fim da tela — as três últimas abas são
          exceções, com ações próprias e imediatas.
        </p>
        <h3>k-anonimato</h3>
        <p>
          Define o número mínimo de respostas que um grupo (instituição +
          setor + questionário) precisa ter antes do resultado dele
          aparecer em "Resultados" — protege o anonimato de quem
          respondeu. Aumentar o valor deixa os resultados mais seguros mas
          demora mais pra aparecerem; diminuir mostra resultados mais cedo,
          com menos proteção.
        </p>
        <h3>Recursos de IA</h3>
        <p>
          Liga/desliga, um a um, os três recursos opcionais que usam IA:
          chat de ajuda contextual, criação assistida de questionário e
          análise assistida de resultados. Desligados por padrão — só
          funcionam se também houver um provedor LLM configurado na aba
          seguinte.
        </p>
        <h3>Provedor LLM</h3>
        <p>
          Configura qual provedor de IA (OpenAI, Anthropic, Gemini etc.),
          modelo e chave de API alimentam os recursos de IA da aba
          anterior — é o único lugar do sistema que fala com esse
          provedor.
        </p>
        <h3>Acessibilidade</h3>
        <p>
          Liga/desliga o botão flutuante de acessibilidade (tamanho de
          fonte e alto contraste) que aparece em todo o site — inclusive
          para quem não está logado. Desativar aqui remove o botão de
          todo mundo; cada visitante continua controlando fonte/contraste
          por conta própria enquanto o botão estiver visível.
        </p>
        <h3>Exportação de dados</h3>
        <p>
          Baixa em CSV os dados brutos do sistema (respostas, resultados
          agregados, planos de ação etc.) — cada exportação fica registrada
          no log de atividade, já que pode conter dados sensíveis.
        </p>
        <h3>Log de atividade</h3>
        <p>
          Histórico de ações administrativas sensíveis (quem exportou o
          quê, mudanças de configuração, resets) — pra auditoria, não é
          editável.
        </p>
        <h3>Resetar sistema</h3>
        <p>
          Apaga permanentemente respostas e/ou outros dados do sistema —
          ação destrutiva e irreversível, protegida por uma frase de
          confirmação. Use só se tiver certeza absoluta do que está
          fazendo.
        </p>
      </PageHeader>
      {erro && (
        <p role="alert" style={{ color: "var(--cor-perigo)" }}>
          {erro}
        </p>
      )}
      {mensagem && <p role="status">{mensagem}</p>}

      <div className={styles.abas} role="tablist" aria-label="Categorias de configuração">
        {ABAS.map((aba) => (
          <button
            key={aba.valor}
            type="button"
            role="tab"
            aria-selected={abaAtiva === aba.valor}
            className={`${styles.aba} ${abaAtiva === aba.valor ? styles.abaAtiva : ""}`}
            onClick={() => setAbaAtiva(aba.valor)}
          >
            {aba.rotulo}
          </button>
        ))}
      </div>

      <form onSubmit={handleSalvar} hidden={!ABAS_FORM_CONFIG.includes(abaAtiva)}>
        <div className={styles.cartao} hidden={abaAtiva !== "k-anonimato"}>
          <div className={styles.cabecalhoCartao}>
            <IconeEscudo className={styles.iconeCartao} />
            <h2 className={styles.tituloCartao}>k-anonimato</h2>
          </div>
          <div className={formStyles.campo}>
            <label htmlFor="threshold" className={formStyles.rotulo}>
              Número mínimo de respostas para exibir um resultado
            </label>
            <input
              id="threshold"
              type="number"
              min={1}
              className={formStyles.controle}
              value={config.k_anonimato_threshold}
              onChange={(e) =>
                setConfig({ ...config, k_anonimato_threshold: Number(e.target.value) })
              }
              required
            />
            <p className={formStyles.textoAjuda}>
              Grupos com menos respostas que este valor aparecem como
              "dados insuficientes" no dashboard, tanto para Consultor
              quanto Administrador — mudanças valem imediatamente para
              resultados já existentes.
            </p>
          </div>
        </div>

        <div className={styles.cartao} hidden={abaAtiva !== "ia"}>
          <div className={styles.cabecalhoCartao}>
            <IconeIA className={styles.iconeCartao} />
            <h2 className={styles.tituloCartao}>Recursos de IA (opcionais)</h2>
          </div>
          <p className={styles.descricaoCartao}>
            Desligados por padrão. O sistema funciona por completo com
            todos os toggles desativados — nenhuma tela essencial depende
            de IA. As três funcionalidades já estão implementadas e
            requerem provedor LLM configurado ao lado.
          </p>

          <div className={styles.listaToggles}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={config.ia_sugestao_questionario_enabled}
                onChange={(e) =>
                  setConfig({ ...config, ia_sugestao_questionario_enabled: e.target.checked })
                }
              />
              Criação assistida de questionário
            </label>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={config.ia_analise_resultados_enabled}
                onChange={(e) =>
                  setConfig({ ...config, ia_analise_resultados_enabled: e.target.checked })
                }
              />
              Análise assistida de resultados
            </label>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={config.ia_chat_enabled}
                onChange={(e) => setConfig({ ...config, ia_chat_enabled: e.target.checked })}
              />
              Chat de ajuda contextual
            </label>
          </div>
        </div>

        <div className={styles.cartao} hidden={abaAtiva !== "llm"}>
          <div className={styles.cabecalhoCartao}>
            <IconeConexao className={styles.iconeCartao} />
            <h2 className={styles.tituloCartao}>Provedor LLM</h2>
          </div>
          <p className={styles.descricaoCartao}>
            Conexão usada pelos recursos de IA acima, quando ativados.
          </p>
          {nenhumRecursoIaAtivo && (
            <p className={styles.avisoInativo}>
              Nenhum recurso de IA está ativado acima — esta configuração
              fica registrada, mas sem efeito até que pelo menos um seja
              marcado.
            </p>
          )}

          <div className={formStyles.campo}>
            <label htmlFor="llm-provider" className={formStyles.rotulo}>
              Provedor LLM
            </label>
            <select
              id="llm-provider"
              className={formStyles.controle}
              value={config.llm_provider ?? ""}
              onChange={(e) => {
                const provedor = e.target.value || null;
                setConfig({
                  ...config,
                  llm_provider: provedor,
                  llm_base_url: provedor ? BASE_URLS_PROVEDOR[provedor] ?? "" : "",
                  llm_model: provedor ? MODELOS_PROVEDOR[provedor] ?? "" : "",
                });
              }}
            >
              <option value="">Nenhum</option>
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="openrouter">OpenRouter</option>
              <option value="nvidia_build">NVIDIA Build</option>
              <option value="cohere">Cohere</option>
            </select>
          </div>
          <div className={formStyles.campo}>
            <label htmlFor="llm-base-url" className={formStyles.rotulo}>
              Base URL
            </label>
            <input
              id="llm-base-url"
              className={formStyles.controle}
              value={config.llm_base_url ?? ""}
              onChange={(e) => setConfig({ ...config, llm_base_url: e.target.value })}
            />
            <p className={formStyles.textoAjuda}>
              Preenchida automaticamente com a base compatível com OpenAI de cada
              provedor ao selecioná-lo acima — pode ser editada livremente.
            </p>
          </div>
          <div className={formStyles.campo}>
            <label htmlFor="llm-model" className={formStyles.rotulo}>
              Modelo
            </label>
            <input
              id="llm-model"
              className={formStyles.controle}
              value={config.llm_model ?? ""}
              onChange={(e) => setConfig({ ...config, llm_model: e.target.value })}
            />
            <p className={formStyles.textoAjuda}>
              Nome/slug do modelo usado nas chamadas ao provedor (ex.:{" "}
              <code>claude-sonnet-5</code>, <code>gpt-4o-mini</code>) — sugestão
              preenchida automaticamente ao trocar de provedor, mas sempre
              editável (necessário sobretudo em OpenRouter/NVIDIA Build, cujos
              slugs dependem do catálogo disponível na conta).
            </p>
          </div>
          <div className={formStyles.campo}>
            <label htmlFor="llm-api-key" className={formStyles.rotulo}>
              Chave de API{" "}
              {config.llm_api_key_configurada && (
                <span className={formStyles.textoAjuda}>(já configurada — deixe em branco para manter)</span>
              )}
            </label>
            <input
              id="llm-api-key"
              type="password"
              className={formStyles.controle}
              value={novaChaveApi}
              onChange={(e) => setNovaChaveApi(e.target.value)}
              placeholder={config.llm_api_key_configurada ? "••••••••" : ""}
            />
          </div>
        </div>

        <div className={styles.cartao} hidden={abaAtiva !== "acessibilidade"}>
          <div className={styles.cabecalhoCartao}>
            <IconeAcessibilidade className={styles.iconeCartao} />
            <h2 className={styles.tituloCartao}>Acessibilidade</h2>
          </div>
          <p className={styles.descricaoCartao}>
            Controla o botão flutuante de acessibilidade (ajuste de tamanho
            de fonte e alto contraste) que aparece no canto da tela em todo
            o site — inclusive para quem não está logado.
          </p>

          <div className={styles.listaToggles}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={config.acessibilidade_widget_enabled}
                onChange={(e) =>
                  setConfig({ ...config, acessibilidade_widget_enabled: e.target.checked })
                }
              />
              Mostrar o widget de acessibilidade
            </label>
          </div>
        </div>

        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar configurações"}
        </Button>
      </form>

      <div className={`${styles.cartao} ${styles.cartaoLargo}`} hidden={abaAtiva !== "exportacao"}>
        <div className={styles.cabecalhoCartao}>
          <IconeExportacao className={styles.iconeCartao} />
          <h2 className={styles.tituloCartao}>Exportação de dados</h2>
        </div>

        <div className={styles.gradeExportacoes}>
          <div className={`${styles.cartaoExportacao} ${styles.cartaoExportacaoDestaque}`}>
            <h3>Respostas brutas</h3>
            <div
              className={tabela.secaoAdmin}
              style={{
                background: "var(--cor-perigo-fundo)",
                color: "var(--cor-perigo)",
                padding: "1rem",
                borderRadius: "var(--raio-borda)",
              }}
            >
              <p>
                <strong>Aviso de sensibilidade dos dados.</strong> Esta
                exportação contorna o filtro de k-anonimato do dashboard: o CSV
                contém uma linha por resposta individual (desagregada). Embora
                não tenha nome, e-mail ou qualquer identificador direto, esses
                dados são considerados sensíveis pela LGPD e podem ser
                reidentificáveis por cruzamento (ex.: setor muito pequeno). A
                guarda e o uso do arquivo exportado são de sua responsabilidade.
                Esta exportação fica registrada no log de atividade.
              </p>
            </div>

            <form onSubmit={handleExportar} style={{ maxWidth: "28rem" }}>
              <h4>Filtros (opcionais)</h4>
              <DropdownInstituicao
                value={instituicaoExportacao?.id}
                onChange={(nova) => {
                  setInstituicaoExportacao(nova);
                  setSetorExportacao(null);
                }}
                carregarInstituicoes={adminApi.listarInstituicoes}
              />
              <DropdownSetor
                instituicaoId={instituicaoExportacao?.id}
                value={setorExportacao?.id}
                onChange={setSetorExportacao}
                carregarSetores={adminApi.listarSetores}
              />
              <div className={formStyles.campo}>
                <label htmlFor="questionario-export" className={formStyles.rotulo}>
                  Questionário
                </label>
                <select
                  id="questionario-export"
                  className={formStyles.controle}
                  value={questionarioIdExportacao}
                  onChange={(e) => setQuestionarioIdExportacao(e.target.value)}
                >
                  <option value="">Todos</option>
                  {questionariosExportacao.map((questionario) => (
                    <option key={questionario.id} value={questionario.id}>
                      {questionario.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <label style={{ display: "block", margin: "1rem 0" }}>
                <input
                  type="checkbox"
                  checked={confirmadoExportacao}
                  onChange={(e) => setConfirmadoExportacao(e.target.checked)}
                />{" "}
                Estou ciente da sensibilidade destes dados e confirmo a
                exportação.
              </label>

              {erroExportacao && (
                <p role="alert" style={{ color: "var(--cor-perigo)" }}>
                  {erroExportacao}
                </p>
              )}
              {mensagemExportacao && <p role="status">{mensagemExportacao}</p>}

              <Button type="submit" disabled={!confirmadoExportacao || exportando}>
                {exportando ? "Exportando..." : "Exportar CSV"}
              </Button>
            </form>
          </div>

          <div className={styles.cartaoExportacao}>
            <h4>Visão geral (PDF)</h4>
            <p>
              Mesmos números do painel "Visão geral" (instituições, questionários, usuários,
              respostas, alerta de k-anonimato e ranking por instituição), formatados como um
              relatório em PDF.
            </p>
            {erroEstatisticasExport && (
              <p role="alert" style={{ color: "var(--cor-perigo)" }}>
                {erroEstatisticasExport}
              </p>
            )}
            <Button type="button" onClick={handleExportarEstatisticas} disabled={exportandoEstatisticas}>
              {exportandoEstatisticas ? "Exportando..." : "Exportar PDF"}
            </Button>
          </div>

          <div className={styles.cartaoExportacao}>
            <h4>Resultados</h4>
            <p>
              Mesmo recorte do painel "Resultados" (dimensões com risco/nível de risco,
              comparável entre instrumentos) — já passa pelo filtro de k-anonimato.
            </p>
            <div className={styles.camposExportacao}>
              <DropdownInstituicao
                value={instituicaoResultadosExport?.id}
                onChange={(nova) => {
                  setInstituicaoResultadosExport(nova);
                  setSetorResultadosExport(null);
                }}
                carregarInstituicoes={adminApi.listarInstituicoes}
              />
              <DropdownSetor
                instituicaoId={instituicaoResultadosExport?.id}
                value={setorResultadosExport?.id}
                onChange={setSetorResultadosExport}
                carregarSetores={adminApi.listarSetores}
              />
              <div className={formStyles.campo}>
                <label htmlFor="questionario-resultados-export" className={formStyles.rotulo}>
                  Questionário
                </label>
                <select
                  id="questionario-resultados-export"
                  className={formStyles.controle}
                  value={questionarioIdResultadosExport}
                  onChange={(e) => setQuestionarioIdResultadosExport(e.target.value)}
                >
                  <option value="">Todos</option>
                  {questionariosExportacao.map((questionario) => (
                    <option key={questionario.id} value={questionario.id}>
                      {questionario.titulo}
                    </option>
                  ))}
                </select>
              </div>
              <div className={formStyles.campo}>
                <label htmlFor="instrumento-resultados-export" className={formStyles.rotulo}>
                  Instrumento
                </label>
                <select
                  id="instrumento-resultados-export"
                  className={formStyles.controle}
                  value={instrumentoResultadosExport}
                  onChange={(e) => setInstrumentoResultadosExport(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="karasek">Karasek</option>
                  <option value="copsoq">COPSOQ</option>
                  <option value="misto">Misto</option>
                </select>
              </div>
            </div>
            {erroResultadosExport && (
              <p role="alert" style={{ color: "var(--cor-perigo)" }}>
                {erroResultadosExport}
              </p>
            )}
            <Button type="button" onClick={handleExportarResultados} disabled={exportandoResultados}>
              {exportandoResultados ? "Exportando..." : "Exportar CSV"}
            </Button>
          </div>

          <div className={styles.cartaoExportacao}>
            <h4>Resultados do Consultor</h4>
            <p>
              Valores agregados crus por instrumento de uma instituição (inclui a linha
              "geral", ex.: quadrante do Karasek) — mesmo dado que o Consultor vê na própria
              tela de Resultados. Escolha uma instituição para exportar.
            </p>
            <div className={styles.camposExportacao}>
              <DropdownInstituicao
                value={instituicaoResultadosConsultorExport?.id}
                onChange={(nova) => {
                  setInstituicaoResultadosConsultorExport(nova);
                  setSetorResultadosConsultorExport(null);
                }}
                carregarInstituicoes={adminApi.listarInstituicoes}
              />
              <DropdownSetor
                instituicaoId={instituicaoResultadosConsultorExport?.id}
                value={setorResultadosConsultorExport?.id}
                onChange={setSetorResultadosConsultorExport}
                carregarSetores={adminApi.listarSetores}
              />
            </div>
            {erroResultadosConsultorExport && (
              <p role="alert" style={{ color: "var(--cor-perigo)" }}>
                {erroResultadosConsultorExport}
              </p>
            )}
            <Button
              type="button"
              onClick={handleExportarResultadosInstituicao}
              disabled={!instituicaoResultadosConsultorExport || exportandoResultadosConsultor}
            >
              {exportandoResultadosConsultor ? "Exportando..." : "Exportar CSV"}
            </Button>
          </div>

          <div className={styles.cartaoExportacao}>
            <h4>Planos de Ação</h4>
            <p>
              Todos os planos (ciclos) de uma instituição, uma linha por ação — escolha a
              instituição para exportar.
            </p>
            <div className={styles.camposExportacao}>
              <DropdownInstituicao
                value={instituicaoPlanosExport?.id}
                onChange={setInstituicaoPlanosExport}
                carregarInstituicoes={adminApi.listarInstituicoes}
              />
            </div>
            {erroPlanosExport && (
              <p role="alert" style={{ color: "var(--cor-perigo)" }}>
                {erroPlanosExport}
              </p>
            )}
            <Button
              type="button"
              onClick={handleExportarPlanos}
              disabled={!instituicaoPlanosExport || exportandoPlanos}
            >
              {exportandoPlanos ? "Exportando..." : "Exportar CSV"}
            </Button>
          </div>

          <div className={styles.cartaoExportacao}>
            <h4>Questionários</h4>
            <p>Todos os questionários cadastrados, uma linha por item (domínio + item).</p>
            {erroQuestionariosExport && (
              <p role="alert" style={{ color: "var(--cor-perigo)" }}>
                {erroQuestionariosExport}
              </p>
            )}
            <Button type="button" onClick={handleExportarQuestionarios} disabled={exportandoQuestionarios}>
              {exportandoQuestionarios ? "Exportando..." : "Exportar CSV"}
            </Button>
          </div>
        </div>
      </div>

      <div className={`${styles.cartao} ${styles.cartaoLargo}`} hidden={abaAtiva !== "logs"}>
        <div className={styles.cabecalhoCartao}>
          <IconeLogs className={styles.iconeCartao} />
          <h2 className={styles.tituloCartao}>Log de atividade</h2>
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", maxWidth: "40rem" }}>
          <div className={formStyles.campo} style={{ flex: "1 1 12rem" }}>
            <label htmlFor="filtro-usuario" className={formStyles.rotulo}>
              Usuário
            </label>
            <select
              id="filtro-usuario"
              className={formStyles.controle}
              value={usuarioIdLogs}
              onChange={(e) => setUsuarioIdLogs(e.target.value)}
            >
              <option value="">Todos</option>
              {usuariosLogs.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nome}
                </option>
              ))}
            </select>
          </div>
          <div className={formStyles.campo} style={{ flex: "1 1 12rem" }}>
            <label htmlFor="filtro-acao" className={formStyles.rotulo}>
              Ação
            </label>
            <input
              id="filtro-acao"
              className={formStyles.controle}
              value={acaoLogs}
              onChange={(e) => setAcaoLogs(e.target.value)}
              placeholder="ex.: exportar_respostas_csv"
            />
          </div>
        </div>

        {erroLogs && (
          <p role="alert" style={{ color: "var(--cor-perigo)" }}>
            {erroLogs}
          </p>
        )}
        {carregandoLogs ? (
          <p>Carregando...</p>
        ) : (
          <div className={tabela.envoltorioTabela}>
            <table className={tabela.tabela}>
              <thead>
                <tr>
                  <th scope="col">Quando</th>
                  <th scope="col">Usuário</th>
                  <th scope="col">Ação</th>
                  <th scope="col">Entidade</th>
                  <th scope="col">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.criado_em).toLocaleString("pt-BR")}</td>
                    <td>{usuariosLogs.find((u) => u.id === log.usuario_id)?.nome ?? log.usuario_id}</td>
                    <td>{log.acao}</td>
                    <td>
                      {log.entidade}
                      {log.entidade_id ? ` #${log.entidade_id}` : ""}
                    </td>
                    <td>
                      <code>{log.detalhes ? JSON.stringify(log.detalhes) : "—"}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div
        className={`${styles.cartao} ${styles.cartaoPerigo} ${styles.cartaoCentralizado}`}
        hidden={abaAtiva !== "reset"}
      >
        <div className={styles.cabecalhoCartao}>
          <IconePerigo className={styles.iconeCartao} />
          <h2 className={styles.tituloCartao}>Resetar sistema</h2>
        </div>
        <div
          className={tabela.secaoAdmin}
          style={{
            background: "var(--cor-perigo-fundo)",
            color: "var(--cor-perigo)",
            padding: "1rem",
            borderRadius: "var(--raio-borda)",
            marginBottom: "var(--espaco-3)",
          }}
        >
          <p>
            <strong>Ação irreversível.</strong> Apaga permanentemente todos os dados
            operacionais: instituições, setores, questionários, respostas, resultados
            agregados, planos de ação, memória institucional e conversas de chat — de
            todos os usuários. Todas as sessões (inclusive a sua) são encerradas.
          </p>
          <p style={{ margin: 0 }}>
            <strong>É preservado:</strong> todas as contas com papel Administrador já
            cadastradas. As configurações do sistema (k-anonimato, IA, provedor LLM)
            voltam ao padrão de fábrica.
          </p>
        </div>
        <Button type="button" variante="perigo" onClick={handleAbrirModalReset}>
          Resetar sistema
        </Button>
      </div>

      <ConfirmModal
        aberto={mostrarModalReset}
        titulo="Confirmar reset do sistema"
        perigo
        confirmando={resetando}
        textoConfirmar="Resetar sistema"
        textoConfirmando="Resetando..."
        onConfirmar={handleConfirmarReset}
        onCancelar={() => setMostrarModalReset(false)}
      >
        <p>
          Esta ação não pode ser desfeita. Para confirmar, digite exatamente{" "}
          <strong>{FRASE_CONFIRMACAO_RESET}</strong> e informe sua senha atual.
        </p>
        <div className={formStyles.campo}>
          <label htmlFor="frase-reset" className={formStyles.rotulo}>
            Frase de confirmação
          </label>
          <input
            id="frase-reset"
            className={formStyles.controle}
            value={fraseReset}
            onChange={(e) => setFraseReset(e.target.value)}
            placeholder={FRASE_CONFIRMACAO_RESET}
            autoComplete="off"
          />
        </div>
        <div className={formStyles.campo}>
          <label htmlFor="senha-reset" className={formStyles.rotulo}>
            Senha atual
          </label>
          <input
            id="senha-reset"
            type="password"
            className={formStyles.controle}
            value={senhaAtualReset}
            onChange={(e) => setSenhaAtualReset(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {erroReset && (
          <p role="alert" style={{ color: "var(--cor-perigo)" }}>
            {erroReset}
          </p>
        )}
      </ConfirmModal>
    </section>
  );
}
