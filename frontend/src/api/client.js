import axios from "axios";

// VITE_API_BASE_URL aponta para a raiz do backend (ex.: http://localhost:8000),
// sem o prefixo /api/v1 — ele é adicionado aqui, uma única vez, para toda a API.
const baseURL = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

export const api = axios.create({ baseURL });

// ---------------------------------------------------------------------------
// Token de sessão: guardado só em memória (módulo), nunca em
// localStorage/sessionStorage — regra obrigatória do projeto. Quem é dono
// do valor "de verdade" é o estado do AuthContext; este módulo só precisa
// de uma cópia acessível fora de componentes React para montar o header
// Authorization em cada requisição. Ao atualizar a página, esta variável
// (e a sessão) são perdidas de propósito.
let tokenAtual = null;

export function definirTokenSessao(token) {
  tokenAtual = token;
}

api.interceptors.request.use((config) => {
  if (tokenAtual) {
    config.headers.Authorization = `Bearer ${tokenAtual}`;
  }
  return config;
});

// Callback registrado pelo AuthContext: reage a uma sessão inválida/expirada
// detectada pelo próprio backend (401 em qualquer chamada), garantindo que
// o frontend nunca continue "confiando" em um token que o servidor já não
// aceita mais.
let aoFicarNaoAutenticado = null;

export function registrarCallbackNaoAutenticado(callback) {
  aoFicarNaoAutenticado = callback;
}

// Formato de erro padrão da API (docs/07): { erro, mensagem, detalhes }.
// Este interceptor garante que todo erro relançado pelo cliente HTTP siga
// esse mesmo formato, mesmo falhas de rede ou respostas sem corpo JSON.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && aoFicarNaoAutenticado) {
      aoFicarNaoAutenticado();
    }

    const dadosErro = error.response?.data;
    if (dadosErro?.erro && dadosErro?.mensagem) {
      return Promise.reject(dadosErro);
    }

    return Promise.reject({
      erro: "erro_rede",
      mensagem: "Não foi possível se comunicar com o servidor. Tente novamente.",
      detalhes: {},
    });
  }
);
