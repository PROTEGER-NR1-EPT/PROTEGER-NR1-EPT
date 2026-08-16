import { useEffect, useState } from "react";

import * as adminApi from "../../api/admin";
import { Button } from "../../components/forms/Button";
import formStyles from "../../components/forms/FormField.module.css";
import styles from "./ConfiguracoesPage.module.css";

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

export function ConfiguracoesPage() {
  const [config, setConfig] = useState(null);
  const [novaChaveApi, setNovaChaveApi] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [mensagem, setMensagem] = useState(null);

  useEffect(() => {
    adminApi
      .obterConfiguracoes()
      .then(setConfig)
      .catch((erroApi) => setErro(erroApi.mensagem))
      .finally(() => setCarregando(false));
  }, []);

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
        llm_provider: config.llm_provider,
        llm_base_url: config.llm_base_url,
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
      <h1>Configurações do sistema</h1>
      {erro && (
        <p role="alert" style={{ color: "var(--cor-perigo)" }}>
          {erro}
        </p>
      )}
      {mensagem && <p role="status">{mensagem}</p>}

      <form onSubmit={handleSalvar}>
        <div className={styles.cartao}>
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

        <div className={styles.cartao}>
          <div className={styles.cabecalhoCartao}>
            <IconeIA className={styles.iconeCartao} />
            <h2 className={styles.tituloCartao}>Recursos de IA (opcionais)</h2>
          </div>
          <p className={styles.descricaoCartao}>
            Desligados por padrão. O sistema funciona por completo com
            todos os toggles desativados — nenhuma tela essencial depende
            de IA. Nenhuma integração real com LLM está implementada nesta
            versão; estes campos só ficam registrados para uso futuro.
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

        <div className={styles.cartao}>
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
              onChange={(e) => setConfig({ ...config, llm_provider: e.target.value || null })}
            >
              <option value="">Nenhum</option>
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="openrouter">OpenRouter</option>
              <option value="nvidia_build">NVIDIA Build</option>
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

        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar configurações"}
        </Button>
      </form>
    </section>
  );
}
