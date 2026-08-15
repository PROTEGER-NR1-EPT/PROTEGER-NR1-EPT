import { beforeAll, describe, expect, it } from "vitest";

import * as authApi from "./auth";
import { api, definirTokenSessao } from "./client";
import * as publicoApi from "./publico";

// ---------------------------------------------------------------------------
// Teste de INTEGRAÇÃO, não unitário: chama a API real (nada de mock), para
// responder diretamente "o frontend está se comunicando com o backend?".
// Por isso precisa do backend rodando localmente antes de `npm test`
// (ver backend/README.md):
//
//   cd backend && flask db upgrade && flask bootstrap-admin && python run.py
//
// As credenciais usadas abaixo são as de bootstrap padrão de
// backend/.env.example (ADMIN_BOOTSTRAP_EMAIL/ADMIN_BOOTSTRAP_PASSWORD) —
// se o seu backend/.env usa outros valores, ajuste aqui também.
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = "admin@exemplo.com";
const ADMIN_SENHA = "troque-esta-senha";

beforeAll(async () => {
  try {
    await api.get("/instituicoes");
  } catch (erro) {
    throw new Error(
      `Não foi possível alcançar o backend em ${import.meta.env.VITE_API_BASE_URL} ` +
        `(${erro.mensagem ?? erro.message}). Ele está rodando? Ver backend/README.md.`
    );
  }
});

describe("conectividade com a API (VITE_API_BASE_URL)", () => {
  it("VITE_API_BASE_URL está configurada", () => {
    expect(import.meta.env.VITE_API_BASE_URL).toBeTruthy();
  });

  it("GET /instituicoes responde com uma lista (rota pública)", async () => {
    const instituicoes = await publicoApi.listarInstituicoes();
    expect(Array.isArray(instituicoes)).toBe(true);
  });

  it("POST /auth/login com credenciais erradas é rejeitado no formato esperado", async () => {
    await expect(authApi.login(ADMIN_EMAIL, "senha-errada")).rejects.toMatchObject({
      erro: "credenciais_invalidas",
      mensagem: expect.any(String),
    });
  });

  it("POST /auth/login com credenciais do bootstrap devolve um token válido", async () => {
    const resposta = await authApi.login(ADMIN_EMAIL, ADMIN_SENHA);
    expect(resposta.token).toEqual(expect.any(String));
    expect(resposta.usuario.papel).toBe("administrador");
  });

  it("uma rota protegida sem token é rejeitada com 401 (nao_autenticado)", async () => {
    definirTokenSessao(null);
    await expect(api.get("/admin/instituicoes")).rejects.toMatchObject({
      erro: "nao_autenticado",
    });
  });

  it("uma rota protegida com o token do login funciona de ponta a ponta", async () => {
    const { token } = await authApi.login(ADMIN_EMAIL, ADMIN_SENHA);
    definirTokenSessao(token);

    const resposta = await api.get("/admin/instituicoes");
    expect(resposta.status).toBe(200);
    expect(Array.isArray(resposta.data)).toBe(true);

    await authApi.logout();
    definirTokenSessao(null);
  });
});
