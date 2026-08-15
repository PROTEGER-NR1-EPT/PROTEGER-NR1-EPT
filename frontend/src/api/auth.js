import { api } from "./client";

export async function login(email, senha) {
  const { data } = await api.post("/auth/login", { email, senha });
  return data;
}

export async function logout() {
  const { data } = await api.post("/auth/logout");
  return data;
}
