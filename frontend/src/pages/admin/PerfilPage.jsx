// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useState } from "react";

import * as authApi from "../../api/auth";
import { Button } from "../../components/forms/Button";
import { PageHeader } from "../../components/common/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import formStyles from "../../components/forms/FormField.module.css";
import styles from "./PerfilPage.module.css";

const SENHA_VAZIA = { senhaAtual: "", senhaNova: "", confirmarSenhaNova: "" };

const ROTULO_PAPEL = {
  administrador: "Administrador",
  consultor: "Consultor",
};

export function PerfilPage() {
  const { usuario, papel } = useAuth();
  const [senha, setSenha] = useState(SENHA_VAZIA);
  const [erro, setErro] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function handleAlterarSenha(evento) {
    evento.preventDefault();
    setErro(null);
    setMensagem(null);

    if (senha.senhaNova !== senha.confirmarSenhaNova) {
      setErro("A confirmação não corresponde à nova senha.");
      return;
    }

    setEnviando(true);
    try {
      await authApi.alterarSenha(senha.senhaAtual, senha.senhaNova);
      setSenha(SENHA_VAZIA);
      setMensagem("Senha alterada com sucesso.");
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className={styles.pagina}>
      <PageHeader titulo="Meu perfil">
        <p>
          Seus próprios dados de acesso — nome, e-mail e papel (Consultor
          ou Administrador) são só de leitura aqui; pra mudar algo assim,
          peça a um Administrador (em "Usuários", se você for Administrador,
          ou peça a outro Administrador do sistema).
        </p>
        <p>
          O que dá pra fazer nesta tela é trocar sua própria senha: informe
          a senha atual e a nova (mínimo de 8 caracteres, digitada duas
          vezes pra confirmar) e clique em "Salvar nova senha". Vale
          principalmente pra trocar a senha provisória recebida no primeiro
          acesso.
        </p>
      </PageHeader>

      <div className={styles.cartao}>
        <div className={styles.cabecalhoPerfil}>
          <span className={styles.avatarGrande} aria-hidden="true">
            {usuario?.nome?.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className={styles.nomeGrande}>{usuario?.nome}</p>
            <span className={styles.seloPapel}>{ROTULO_PAPEL[papel] ?? papel}</span>
          </div>
        </div>
        <dl className={styles.dados}>
          <dt>E-mail</dt>
          <dd>{usuario?.email}</dd>
        </dl>
      </div>

      <div className={styles.cartao}>
        <h2 className={styles.tituloSecao}>Alterar senha</h2>

        {erro && (
          <p className={styles.mensagemErro} role="alert">
            {erro}
          </p>
        )}
        {mensagem && (
          <p className={styles.mensagemSucesso} role="status">
            {mensagem}
          </p>
        )}

        <form onSubmit={handleAlterarSenha} className={styles.formulario}>
          <div className={formStyles.campo}>
            <label htmlFor="senha-atual" className={formStyles.rotulo}>
              Senha atual
            </label>
            <input
              id="senha-atual"
              type="password"
              autoComplete="current-password"
              className={formStyles.controle}
              value={senha.senhaAtual}
              onChange={(e) => setSenha({ ...senha, senhaAtual: e.target.value })}
              required
            />
          </div>
          <div className={formStyles.campo}>
            <label htmlFor="senha-nova" className={formStyles.rotulo}>
              Nova senha
            </label>
            <input
              id="senha-nova"
              type="password"
              autoComplete="new-password"
              minLength={8}
              className={formStyles.controle}
              value={senha.senhaNova}
              onChange={(e) => setSenha({ ...senha, senhaNova: e.target.value })}
              required
            />
            <span className={formStyles.textoAjuda}>Mínimo de 8 caracteres.</span>
          </div>
          <div className={formStyles.campo}>
            <label htmlFor="confirmar-senha-nova" className={formStyles.rotulo}>
              Confirmar nova senha
            </label>
            <input
              id="confirmar-senha-nova"
              type="password"
              autoComplete="new-password"
              minLength={8}
              className={formStyles.controle}
              value={senha.confirmarSenhaNova}
              onChange={(e) => setSenha({ ...senha, confirmarSenhaNova: e.target.value })}
              required
            />
          </div>
          <Button type="submit" disabled={enviando}>
            {enviando ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </form>
      </div>
    </section>
  );
}
