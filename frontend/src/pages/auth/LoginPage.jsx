import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../../components/forms/Button";
import formStyles from "../../components/forms/FormField.module.css";
import { useAuth } from "../../hooks/useAuth";
import styles from "./LoginPage.module.css";

const HOME_POR_PAPEL = {
  consultor: "/consultor",
  administrador: "/admin",
};

function IconeEntrar() {
  return (
    <svg viewBox="0 0 24 24" className={styles.iconeCartao} aria-hidden="true" focusable="false">
      <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LoginPage() {
  const { entrar, entrando } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(null);

  async function handleSubmit(evento) {
    evento.preventDefault();
    setErro(null);
    try {
      const usuario = await entrar(email, senha);
      navigate(HOME_POR_PAPEL[usuario.papel] ?? "/", { replace: true });
    } catch (erroLogin) {
      setErro(erroLogin.mensagem);
    }
  }

  return (
    <section className={styles.secao}>
      <div className="container">
        <div className={styles.cartao}>
          <IconeEntrar />
          <h1 className={styles.titulo}>Entrar</h1>
          <p className={styles.introducao}>Acesso restrito a Consultores e Administradores.</p>

          <form className={styles.formulario} onSubmit={handleSubmit}>
            {erro && (
              <p className={styles.erro} role="alert">
                {erro}
              </p>
            )}

            <div className={formStyles.campo}>
              <label htmlFor="email" className={formStyles.rotulo}>
                E-mail
              </label>
              <input
                id="email"
                type="email"
                className={formStyles.controle}
                value={email}
                onChange={(evento) => setEmail(evento.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className={formStyles.campo}>
              <label htmlFor="senha" className={formStyles.rotulo}>
                Senha
              </label>
              <input
                id="senha"
                type="password"
                className={formStyles.controle}
                value={senha}
                onChange={(evento) => setSenha(evento.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <Button type="submit" className={styles.botaoEntrar} disabled={entrando}>
              {entrando ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
