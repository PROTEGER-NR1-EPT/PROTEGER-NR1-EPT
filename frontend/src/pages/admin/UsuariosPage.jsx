import { useEffect, useState } from "react";

import * as adminApi from "../../api/admin";
import { Button } from "../../components/forms/Button";
import formStyles from "../../components/forms/FormField.module.css";
import tabela from "../../styles/tabela.module.css";

const USUARIO_VAZIO = { nome: "", email: "", senha: "", papel: "consultor" };

export function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [instituicoes, setInstituicoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [novoUsuario, setNovoUsuario] = useState(USUARIO_VAZIO);

  const [usuarioVinculo, setUsuarioVinculo] = useState("");
  const [instituicoesSelecionadas, setInstituicoesSelecionadas] = useState([]);

  async function recarregar() {
    setCarregando(true);
    try {
      const [listaUsuarios, listaInstituicoes] = await Promise.all([
        adminApi.listarUsuarios(),
        adminApi.listarInstituicoes(),
      ]);
      setUsuarios(listaUsuarios);
      setInstituicoes(listaInstituicoes);
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    recarregar();
  }, []);

  async function handleCriarUsuario(evento) {
    evento.preventDefault();
    setErro(null);
    setMensagem(null);
    try {
      await adminApi.criarUsuario(novoUsuario);
      setNovoUsuario(USUARIO_VAZIO);
      setMensagem("Usuário criado com sucesso.");
      await recarregar();
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    }
  }

  async function handleVincular(evento) {
    evento.preventDefault();
    if (!usuarioVinculo || instituicoesSelecionadas.length === 0) return;
    setErro(null);
    setMensagem(null);
    try {
      await adminApi.vincularInstituicoes(
        usuarioVinculo,
        instituicoesSelecionadas.map(Number)
      );
      setMensagem("Vínculo(s) criado(s) com sucesso.");
      setInstituicoesSelecionadas([]);
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    }
  }

  const consultores = usuarios.filter((u) => u.papel === "consultor");

  return (
    <section>
      <h1>Usuários</h1>
      {erro && (
        <p role="alert" style={{ color: "var(--cor-perigo)" }}>
          {erro}
        </p>
      )}
      {mensagem && <p role="status">{mensagem}</p>}

      <div className={tabela.secaoAdmin}>
        <h2>Usuários cadastrados</h2>
        {carregando ? (
          <p>Carregando...</p>
        ) : (
          <div className={tabela.envoltorioTabela}>
            <table className={tabela.tabela}>
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">E-mail</th>
                  <th scope="col">Papel</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id}>
                    <td>{usuario.nome}</td>
                    <td>{usuario.email}</td>
                    <td>{usuario.papel}</td>
                    <td>
                      <span
                        className={`${tabela.selo} ${usuario.ativo ? tabela.seloAtivo : tabela.seloInativo}`}
                      >
                        {usuario.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3>Novo usuário</h3>
        <form onSubmit={handleCriarUsuario} style={{ maxWidth: "28rem" }}>
          <div className={formStyles.campo}>
            <label htmlFor="nome-usuario" className={formStyles.rotulo}>
              Nome
            </label>
            <input
              id="nome-usuario"
              className={formStyles.controle}
              value={novoUsuario.nome}
              onChange={(e) => setNovoUsuario({ ...novoUsuario, nome: e.target.value })}
              required
            />
          </div>
          <div className={formStyles.campo}>
            <label htmlFor="email-usuario" className={formStyles.rotulo}>
              E-mail
            </label>
            <input
              id="email-usuario"
              type="email"
              className={formStyles.controle}
              value={novoUsuario.email}
              onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })}
              required
            />
          </div>
          <div className={formStyles.campo}>
            <label htmlFor="senha-usuario" className={formStyles.rotulo}>
              Senha provisória
            </label>
            <input
              id="senha-usuario"
              type="password"
              className={formStyles.controle}
              value={novoUsuario.senha}
              onChange={(e) => setNovoUsuario({ ...novoUsuario, senha: e.target.value })}
              required
            />
          </div>
          <div className={formStyles.campo}>
            <label htmlFor="papel-usuario" className={formStyles.rotulo}>
              Papel
            </label>
            <select
              id="papel-usuario"
              className={formStyles.controle}
              value={novoUsuario.papel}
              onChange={(e) => setNovoUsuario({ ...novoUsuario, papel: e.target.value })}
            >
              <option value="consultor">Consultor</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>
          <Button type="submit">Cadastrar usuário</Button>
        </form>
      </div>

      <div className={tabela.secaoAdmin}>
        <h2>Vincular Consultor a instituições</h2>
        <form onSubmit={handleVincular} style={{ maxWidth: "28rem" }}>
          <div className={formStyles.campo}>
            <label htmlFor="consultor-vinculo" className={formStyles.rotulo}>
              Consultor
            </label>
            <select
              id="consultor-vinculo"
              className={formStyles.controle}
              value={usuarioVinculo}
              onChange={(e) => setUsuarioVinculo(e.target.value)}
              required
            >
              <option value="">Selecione um consultor</option>
              {consultores.map((consultor) => (
                <option key={consultor.id} value={consultor.id}>
                  {consultor.nome} ({consultor.email})
                </option>
              ))}
            </select>
          </div>
          <div className={formStyles.campo}>
            <label htmlFor="instituicoes-vinculo" className={formStyles.rotulo}>
              Instituições (Ctrl/Cmd + clique para selecionar mais de uma)
            </label>
            <select
              id="instituicoes-vinculo"
              className={formStyles.controle}
              multiple
              size={Math.min(6, Math.max(3, instituicoes.length))}
              value={instituicoesSelecionadas}
              onChange={(e) =>
                setInstituicoesSelecionadas(
                  Array.from(e.target.selectedOptions, (opcao) => opcao.value)
                )
              }
              required
            >
              {instituicoes.map((instituicao) => (
                <option key={instituicao.id} value={instituicao.id}>
                  {instituicao.nome}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">Vincular</Button>
        </form>
      </div>
    </section>
  );
}
