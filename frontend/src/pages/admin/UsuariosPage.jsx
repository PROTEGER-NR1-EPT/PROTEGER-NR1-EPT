// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useState } from "react";

import * as adminApi from "../../api/admin";
import { BotaoIcone } from "../../components/common/BotaoIcone";
import { Button } from "../../components/forms/Button";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { IconeEditar, IconeExcluir } from "../../components/common/icones";
import formStyles from "../../components/forms/FormField.module.css";
import tabela from "../../styles/tabela.module.css";
import styles from "./UsuariosPage.module.css";

const USUARIO_VAZIO = { nome: "", email: "", senha: "", papel: "consultor" };

const ABAS = [
  { valor: "usuarios", rotulo: "Usuários" },
  { valor: "vinculos", rotulo: "Vínculos institucionais" },
];

export function UsuariosPage() {
  const [abaAtiva, setAbaAtiva] = useState("usuarios");
  const [usuarios, setUsuarios] = useState([]);
  const [instituicoes, setInstituicoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [novoUsuario, setNovoUsuario] = useState(USUARIO_VAZIO);
  const [editandoUsuarioId, setEditandoUsuarioId] = useState(null);
  const [confirmarDesativarUsuario, setConfirmarDesativarUsuario] = useState(null);
  const [desativandoUsuario, setDesativandoUsuario] = useState(false);
  const [erroModalUsuario, setErroModalUsuario] = useState(null);

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

  function handleEditarUsuario(usuario) {
    setErro(null);
    setMensagem(null);
    setEditandoUsuarioId(usuario.id);
    setNovoUsuario({ nome: usuario.nome, email: usuario.email, senha: "", papel: usuario.papel });
  }

  function handleCancelarEdicaoUsuario() {
    setEditandoUsuarioId(null);
    setNovoUsuario(USUARIO_VAZIO);
  }

  async function handleSalvarUsuario(evento) {
    evento.preventDefault();
    setErro(null);
    setMensagem(null);
    try {
      if (editandoUsuarioId) {
        await adminApi.editarUsuario(editandoUsuarioId, {
          nome: novoUsuario.nome,
          email: novoUsuario.email,
          papel: novoUsuario.papel,
        });
        setMensagem("Usuário atualizado com sucesso.");
        setEditandoUsuarioId(null);
      } else {
        await adminApi.criarUsuario(novoUsuario);
        setMensagem("Usuário criado com sucesso.");
      }
      setNovoUsuario(USUARIO_VAZIO);
      await recarregar();
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    }
  }

  async function handleReativarUsuario(usuario) {
    setErro(null);
    try {
      await adminApi.editarUsuario(usuario.id, { ativo: true });
      await recarregar();
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    }
  }

  async function handleConfirmarDesativacaoUsuario() {
    if (!confirmarDesativarUsuario) return;
    setDesativandoUsuario(true);
    setErroModalUsuario(null);
    try {
      await adminApi.desativarUsuario(confirmarDesativarUsuario.id);
      if (editandoUsuarioId === confirmarDesativarUsuario.id) handleCancelarEdicaoUsuario();
      setConfirmarDesativarUsuario(null);
      await recarregar();
    } catch (erroApi) {
      setErroModalUsuario(erroApi.mensagem);
    } finally {
      setDesativandoUsuario(false);
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
      await recarregar();
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    }
  }

  async function handleDesvincular(usuario, instituicao) {
    setErro(null);
    try {
      await adminApi.desvincularInstituicao(usuario.id, instituicao.id);
      await recarregar();
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

      <div className={styles.abas} role="tablist" aria-label="Categorias de usuários">
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

      <div className={`${styles.cartao} ${styles.cartaoLargo}`} hidden={abaAtiva !== "usuarios"}>
        <h2>Usuários cadastrados</h2>
        {carregando ? (
          <p>Carregando...</p>
        ) : (
          <div className={`${tabela.envoltorioTabela} ${styles.tabelaResponsiva}`}>
            <table className={tabela.tabela}>
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">E-mail</th>
                  <th scope="col">Papel</th>
                  <th scope="col">Instituições</th>
                  <th scope="col">Status</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id}>
                    <td data-label="Nome">{usuario.nome}</td>
                    <td data-label="E-mail">{usuario.email}</td>
                    <td data-label="Papel">{usuario.papel}</td>
                    <td data-label="Instituições">
                      {usuario.instituicoes.length > 0 ? (
                        usuario.instituicoes.map((instituicao) => (
                          <span key={instituicao.id} className={styles.chip}>
                            {instituicao.nome}
                            <button
                              type="button"
                              className={styles.chipRemover}
                              onClick={() => handleDesvincular(usuario, instituicao)}
                              aria-label={`Desvincular ${usuario.nome} de ${instituicao.nome}`}
                              title="Desvincular"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-label="Status">
                      <span
                        className={`${tabela.selo} ${usuario.ativo ? tabela.seloAtivo : tabela.seloInativo}`}
                      >
                        {usuario.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td data-label="Ações" className={`${tabela.acoes} ${styles.celulaAcoes}`}>
                      <BotaoIcone
                        icone={IconeEditar}
                        rotulo={`Editar ${usuario.nome}`}
                        onClick={() => handleEditarUsuario(usuario)}
                      />
                      {usuario.ativo ? (
                        <BotaoIcone
                          icone={IconeExcluir}
                          rotulo={`Desativar ${usuario.nome}`}
                          onClick={() => setConfirmarDesativarUsuario(usuario)}
                        />
                      ) : (
                        <Button variante="secundario" onClick={() => handleReativarUsuario(usuario)}>
                          Reativar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3>{editandoUsuarioId ? "Editar usuário" : "Novo usuário"}</h3>
        <form onSubmit={handleSalvarUsuario} style={{ maxWidth: "28rem" }}>
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
          {!editandoUsuarioId && (
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
          )}
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
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button type="submit">
              {editandoUsuarioId ? "Salvar alterações" : "Cadastrar usuário"}
            </Button>
            {editandoUsuarioId && (
              <Button type="button" variante="secundario" onClick={handleCancelarEdicaoUsuario}>
                Cancelar edição
              </Button>
            )}
          </div>
        </form>
      </div>

      <div className={styles.cartao} hidden={abaAtiva !== "vinculos"}>
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

      <ConfirmModal
        aberto={confirmarDesativarUsuario !== null}
        titulo={`Desativar "${confirmarDesativarUsuario?.nome ?? ""}"?`}
        perigo
        confirmando={desativandoUsuario}
        textoConfirmar="Desativar"
        onCancelar={() => {
          setConfirmarDesativarUsuario(null);
          setErroModalUsuario(null);
        }}
        onConfirmar={handleConfirmarDesativacaoUsuario}
      >
        <p>
          O usuário deixa de conseguir fazer login imediatamente — o log de
          atividade e os vínculos com instituições são preservados, e você
          pode reativá-lo a qualquer momento.
        </p>
        {erroModalUsuario && (
          <p role="alert" style={{ color: "var(--cor-perigo)" }}>
            {erroModalUsuario}
          </p>
        )}
      </ConfirmModal>
    </section>
  );
}
