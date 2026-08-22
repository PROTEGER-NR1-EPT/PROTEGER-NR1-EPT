// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useState } from "react";

import * as adminApi from "../../api/admin";
import formStyles from "../../components/forms/FormField.module.css";
import tabela from "../../styles/tabela.module.css";

export function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioId, setUsuarioId] = useState("");
  const [acao, setAcao] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    adminApi.listarUsuarios().then(setUsuarios).catch(() => {});
  }, []);

  useEffect(() => {
    setCarregando(true);
    adminApi
      .listarLogs({
        usuario_id: usuarioId || undefined,
        acao: acao || undefined,
      })
      .then(setLogs)
      .catch((erroApi) => setErro(erroApi.mensagem))
      .finally(() => setCarregando(false));
  }, [usuarioId, acao]);

  return (
    <section>
      <h1>Log de atividade</h1>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", maxWidth: "40rem" }}>
        <div className={formStyles.campo} style={{ flex: "1 1 12rem" }}>
          <label htmlFor="filtro-usuario" className={formStyles.rotulo}>
            Usuário
          </label>
          <select
            id="filtro-usuario"
            className={formStyles.controle}
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
          >
            <option value="">Todos</option>
            {usuarios.map((usuario) => (
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
            value={acao}
            onChange={(e) => setAcao(e.target.value)}
            placeholder="ex.: exportar_respostas_csv"
          />
        </div>
      </div>

      {erro && (
        <p role="alert" style={{ color: "var(--cor-perigo)" }}>
          {erro}
        </p>
      )}
      {carregando ? (
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
                  <td>{usuarios.find((u) => u.id === log.usuario_id)?.nome ?? log.usuario_id}</td>
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
    </section>
  );
}
