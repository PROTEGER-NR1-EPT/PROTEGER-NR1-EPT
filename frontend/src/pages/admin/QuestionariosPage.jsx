import { useEffect, useState } from "react";

import * as adminApi from "../../api/admin";
import { Button } from "../../components/forms/Button";
import formStyles from "../../components/forms/FormField.module.css";
import tabela from "../../styles/tabela.module.css";
import styles from "./QuestionariosPage.module.css";

// Só os instrumentos implementados em backend/app/services/instrumentos
// (docs/06). Não há rota que devolva essa lista dinamicamente, então fica
// fixa aqui — se um novo instrumento for adicionado no backend, precisa
// ser adicionado aqui também.
const INSTRUMENTOS = [
  { valor: "karasek", rotulo: "Karasek Demand-Control" },
  { valor: "copsoq", rotulo: "COPSOQ" },
];

let contadorLocal = 0;
function idLocal() {
  contadorLocal += 1;
  return `local-${contadorLocal}`;
}

function novoItem() {
  return {
    _idLocal: idLocal(),
    texto: "",
    tipo_resposta: "escala_likert",
    escala_min: 1,
    escala_max: 5,
    invertido: false,
  };
}

function novoDominio() {
  return { _idLocal: idLocal(), nome: "", chave: "", itens: [novoItem()] };
}

const QUESTIONARIO_VAZIO = {
  titulo: "",
  instrumento: "karasek",
  versao: "1.0",
  ativo: false,
  dominios: [novoDominio()],
};

export function QuestionariosPage() {
  const [questionarios, setQuestionarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [form, setForm] = useState(QUESTIONARIO_VAZIO);

  async function recarregar() {
    setCarregando(true);
    try {
      setQuestionarios(await adminApi.listarQuestionarios());
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    recarregar();
  }, []);

  async function handleAtivar(questionario) {
    setErro(null);
    try {
      await adminApi.editarQuestionario(questionario.id, { ativo: true });
      await recarregar();
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    }
  }

  function atualizarDominio(indice, alteracoes) {
    setForm((atual) => {
      const dominios = [...atual.dominios];
      dominios[indice] = { ...dominios[indice], ...alteracoes };
      return { ...atual, dominios };
    });
  }

  function atualizarItem(indiceDominio, indiceItem, alteracoes) {
    setForm((atual) => {
      const dominios = [...atual.dominios];
      const itens = [...dominios[indiceDominio].itens];
      itens[indiceItem] = { ...itens[indiceItem], ...alteracoes };
      dominios[indiceDominio] = { ...dominios[indiceDominio], itens };
      return { ...atual, dominios };
    });
  }

  function adicionarDominio() {
    setForm((atual) => ({ ...atual, dominios: [...atual.dominios, novoDominio()] }));
  }

  function removerDominio(indice) {
    setForm((atual) => ({
      ...atual,
      dominios: atual.dominios.filter((_, i) => i !== indice),
    }));
  }

  function adicionarItem(indiceDominio) {
    setForm((atual) => {
      const dominios = [...atual.dominios];
      dominios[indiceDominio] = {
        ...dominios[indiceDominio],
        itens: [...dominios[indiceDominio].itens, novoItem()],
      };
      return { ...atual, dominios };
    });
  }

  function removerItem(indiceDominio, indiceItem) {
    setForm((atual) => {
      const dominios = [...atual.dominios];
      dominios[indiceDominio] = {
        ...dominios[indiceDominio],
        itens: dominios[indiceDominio].itens.filter((_, i) => i !== indiceItem),
      };
      return { ...atual, dominios };
    });
  }

  async function handleCriarQuestionario(evento) {
    evento.preventDefault();
    setErro(null);
    setMensagem(null);
    try {
      const payload = {
        titulo: form.titulo,
        instrumento: form.instrumento,
        versao: form.versao,
        ativo: form.ativo,
        dominios: form.dominios.map(({ _idLocal, itens, ...dominio }) => ({
          ...dominio,
          itens: itens.map(({ _idLocal: itemId, ...item }) => item),
        })),
      };
      await adminApi.criarQuestionario(payload);
      setForm(QUESTIONARIO_VAZIO);
      setMensagem("Questionário criado com sucesso.");
      await recarregar();
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    }
  }

  return (
    <section>
      <h1>Questionários</h1>
      {erro && (
        <p role="alert" style={{ color: "var(--cor-perigo)" }}>
          {erro}
        </p>
      )}
      {mensagem && <p role="status">{mensagem}</p>}

      <div className={tabela.secaoAdmin}>
        <h2>Questionários cadastrados</h2>
        <p>
          Só existe um questionário ativo por vez no sistema — ativar um
          desativa automaticamente qualquer outro.
        </p>
        {carregando ? (
          <p>Carregando...</p>
        ) : (
          <div className={tabela.envoltorioTabela}>
            <table className={tabela.tabela}>
              <thead>
                <tr>
                  <th scope="col">Título</th>
                  <th scope="col">Instrumento</th>
                  <th scope="col">Versão</th>
                  <th scope="col">Domínios</th>
                  <th scope="col">Status</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {questionarios.map((questionario) => (
                  <tr key={questionario.id}>
                    <td>{questionario.titulo}</td>
                    <td>{questionario.instrumento}</td>
                    <td>{questionario.versao}</td>
                    <td>{questionario.dominios.length}</td>
                    <td>
                      <span
                        className={`${tabela.selo} ${questionario.ativo ? tabela.seloAtivo : tabela.seloInativo}`}
                      >
                        {questionario.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      {!questionario.ativo && (
                        <Button variante="secundario" onClick={() => handleAtivar(questionario)}>
                          Ativar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={tabela.secaoAdmin}>
        <h2>Novo questionário</h2>
        <form onSubmit={handleCriarQuestionario}>
          <div className={styles.linhaCampos}>
            <div className={formStyles.campo}>
              <label htmlFor="titulo-questionario" className={formStyles.rotulo}>
                Título
              </label>
              <input
                id="titulo-questionario"
                className={formStyles.controle}
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                required
              />
            </div>
            <div className={formStyles.campo}>
              <label htmlFor="instrumento-questionario" className={formStyles.rotulo}>
                Instrumento
              </label>
              <select
                id="instrumento-questionario"
                className={formStyles.controle}
                value={form.instrumento}
                onChange={(e) => setForm({ ...form, instrumento: e.target.value })}
              >
                {INSTRUMENTOS.map((instrumento) => (
                  <option key={instrumento.valor} value={instrumento.valor}>
                    {instrumento.rotulo}
                  </option>
                ))}
              </select>
            </div>
            <div className={formStyles.campo}>
              <label htmlFor="versao-questionario" className={formStyles.rotulo}>
                Versão
              </label>
              <input
                id="versao-questionario"
                className={formStyles.controle}
                value={form.versao}
                onChange={(e) => setForm({ ...form, versao: e.target.value })}
              />
            </div>
          </div>

          <label>
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />{" "}
            Ativar este questionário imediatamente (desativa o atual)
          </label>

          <h3>Domínios</h3>
          {form.dominios.map((dominio, indiceDominio) => (
            <div key={dominio._idLocal} className={styles.dominioForm}>
              <div className={styles.linhaCampos}>
                <div className={formStyles.campo}>
                  <label className={formStyles.rotulo}>Nome do domínio</label>
                  <input
                    className={formStyles.controle}
                    value={dominio.nome}
                    onChange={(e) => atualizarDominio(indiceDominio, { nome: e.target.value })}
                    required
                  />
                </div>
                <div className={formStyles.campo}>
                  <label className={formStyles.rotulo}>
                    Chave
                    {form.instrumento === "karasek" && (
                      <span className={formStyles.textoAjuda}>
                        {" "}
                        (use exatamente "demanda" ou "controle")
                      </span>
                    )}
                  </label>
                  <input
                    className={formStyles.controle}
                    value={dominio.chave}
                    onChange={(e) => atualizarDominio(indiceDominio, { chave: e.target.value })}
                    required
                  />
                </div>
              </div>

              {dominio.itens.map((item, indiceItem) => (
                <div key={item._idLocal} className={styles.itemForm}>
                  <div className={formStyles.campo}>
                    <label className={formStyles.rotulo}>Texto do item</label>
                    <input
                      className={formStyles.controle}
                      value={item.texto}
                      onChange={(e) =>
                        atualizarItem(indiceDominio, indiceItem, { texto: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className={styles.linhaCampos}>
                    <div className={formStyles.campo}>
                      <label className={formStyles.rotulo}>Escala mín.</label>
                      <input
                        type="number"
                        className={formStyles.controle}
                        value={item.escala_min}
                        onChange={(e) =>
                          atualizarItem(indiceDominio, indiceItem, {
                            escala_min: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className={formStyles.campo}>
                      <label className={formStyles.rotulo}>Escala máx.</label>
                      <input
                        type="number"
                        className={formStyles.controle}
                        value={item.escala_max}
                        onChange={(e) =>
                          atualizarItem(indiceDominio, indiceItem, {
                            escala_max: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <label>
                      <input
                        type="checkbox"
                        checked={item.invertido}
                        onChange={(e) =>
                          atualizarItem(indiceDominio, indiceItem, {
                            invertido: e.target.checked,
                          })
                        }
                      />{" "}
                      Pontuação invertida
                    </label>
                  </div>
                  {dominio.itens.length > 1 && (
                    <Button
                      variante="secundario"
                      onClick={() => removerItem(indiceDominio, indiceItem)}
                    >
                      Remover item
                    </Button>
                  )}
                </div>
              ))}

              <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
                <Button variante="secundario" onClick={() => adicionarItem(indiceDominio)}>
                  Adicionar item
                </Button>
                {form.dominios.length > 1 && (
                  <Button variante="secundario" onClick={() => removerDominio(indiceDominio)}>
                    Remover domínio
                  </Button>
                )}
              </div>
            </div>
          ))}

          <Button variante="secundario" onClick={adicionarDominio}>
            Adicionar domínio
          </Button>

          <div style={{ marginTop: "1.5rem" }}>
            <Button type="submit">Cadastrar questionário</Button>
          </div>
        </form>
      </div>
    </section>
  );
}
