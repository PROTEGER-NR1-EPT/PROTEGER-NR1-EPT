// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useState } from "react";

import * as adminApi from "../../api/admin";
import { BotaoIcone } from "../../components/common/BotaoIcone";
import { Button } from "../../components/forms/Button";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { IconeEditar, IconeExcluir } from "../../components/common/icones";
import { PreviewQuestionario } from "../../components/questionario/PreviewQuestionario";
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

const MODOS_APRESENTACAO = [
  { valor: "blocos", rotulo: "Em blocos (agrupados por domínio)" },
  { valor: "intercalado", rotulo: "Intercalado (alterna entre os grupos)" },
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
  return { _idLocal: idLocal(), nome: "", instrumento: "karasek", chave: "", itens: [novoItem()] };
}

const QUESTIONARIO_VAZIO = {
  titulo: "",
  versao: "1.0",
  ativo: false,
  modo_apresentacao: "blocos",
  dominios: [novoDominio()],
};

// Converte o questionário como vem da API (com ids reais) para o formato
// editável do formulário (com _idLocal, usado só como key/controle local).
function questionarioParaForm(questionario) {
  return {
    titulo: questionario.titulo,
    versao: questionario.versao,
    ativo: questionario.ativo,
    modo_apresentacao: questionario.modo_apresentacao,
    dominios: questionario.dominios.map((dominio) => ({
      _idLocal: idLocal(),
      nome: dominio.nome,
      instrumento: dominio.instrumento,
      chave: dominio.chave,
      itens: dominio.itens.map((item) => ({
        _idLocal: idLocal(),
        texto: item.texto,
        tipo_resposta: item.tipo_resposta,
        escala_min: item.escala_min,
        escala_max: item.escala_max,
        invertido: item.invertido,
        regra_condicional: item.regra_condicional,
      })),
    })),
  };
}

export function QuestionariosPage() {
  const [questionarios, setQuestionarios] = useState([]);
  const [instituicoes, setInstituicoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [form, setForm] = useState(QUESTIONARIO_VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState(null);

  const [sugestaoDisponivel, setSugestaoDisponivel] = useState(false);
  const [mostrarPainelIa, setMostrarPainelIa] = useState(false);
  const [pedidoIa, setPedidoIa] = useState("");
  const [instrumentoPreferidoIa, setInstrumentoPreferidoIa] = useState("");
  const [gerandoIa, setGerandoIa] = useState(false);
  const [erroIa, setErroIa] = useState(null);

  useEffect(() => {
    adminApi
      .obterStatusSugestaoQuestionario()
      .then((dados) => setSugestaoDisponivel(dados.disponivel))
      .catch(() => {});
  }, []);

  async function handleGerarComIa(evento) {
    evento.preventDefault();
    setGerandoIa(true);
    setErroIa(null);
    try {
      const rascunho = await adminApi.gerarSugestaoQuestionario(pedidoIa, instrumentoPreferidoIa);
      setForm(questionarioParaForm(rascunho));
      setMensagem("Rascunho gerado pela IA — revise os domínios e itens abaixo antes de salvar.");
      setMostrarPainelIa(false);
      setPedidoIa("");
      setInstrumentoPreferidoIa("");
    } catch (erroApi) {
      setErroIa(erroApi.mensagem);
    } finally {
      setGerandoIa(false);
    }
  }

  async function recarregar() {
    setCarregando(true);
    try {
      const [listaQuestionarios, listaInstituicoes] = await Promise.all([
        adminApi.listarQuestionarios(),
        adminApi.listarInstituicoes(),
      ]);
      setQuestionarios(listaQuestionarios);
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

  async function handleAlternarAtivo(questionario) {
    setErro(null);
    try {
      await adminApi.editarQuestionario(questionario.id, { ativo: !questionario.ativo });
      await recarregar();
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    }
  }

  function handleEditar(questionario) {
    setErro(null);
    setMensagem(null);
    setEditandoId(questionario.id);
    setForm(questionarioParaForm(questionario));
  }

  function handleCancelarEdicao() {
    setEditandoId(null);
    setForm(QUESTIONARIO_VAZIO);
  }

  function handlePedirExclusao(questionario) {
    setErroExclusao(null);
    setConfirmarExclusao(questionario);
  }

  async function handleConfirmarExclusao() {
    if (!confirmarExclusao) return;
    setExcluindo(true);
    setErroExclusao(null);
    try {
      await adminApi.excluirQuestionario(confirmarExclusao.id);
      if (editandoId === confirmarExclusao.id) handleCancelarEdicao();
      setConfirmarExclusao(null);
      setMensagem("Questionário excluído com sucesso.");
      await recarregar();
    } catch (erroApi) {
      setErroExclusao(erroApi.mensagem);
    } finally {
      setExcluindo(false);
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

  async function handleSalvarQuestionario(evento) {
    evento.preventDefault();
    setErro(null);
    setMensagem(null);
    try {
      const payload = {
        titulo: form.titulo,
        versao: form.versao,
        ativo: form.ativo,
        modo_apresentacao: form.modo_apresentacao,
        dominios: form.dominios.map(({ _idLocal, itens, ...dominio }) => ({
          ...dominio,
          itens: itens.map(({ _idLocal: itemId, ...item }) => item),
        })),
      };
      if (editandoId) {
        await adminApi.editarQuestionario(editandoId, payload);
        setMensagem("Questionário atualizado com sucesso.");
        setEditandoId(null);
      } else {
        await adminApi.criarQuestionario(payload);
        setMensagem("Questionário criado com sucesso.");
      }
      setForm(QUESTIONARIO_VAZIO);
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
          Vários questionários podem estar ativos ao mesmo tempo — cada
          instituição escolhe qual usa em "Instituições e setores". Um
          questionário "Inativo" fica indisponível para vínculo até ser
          reativado.
        </p>
        {carregando ? (
          <p>Carregando...</p>
        ) : (
          <div className={tabela.envoltorioTabela}>
            <table className={tabela.tabela}>
              <thead>
                <tr>
                  <th scope="col">Título</th>
                  <th scope="col">Instrumento(s)</th>
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
                    <td>
                      {questionario.instrumentos.length > 0
                        ? questionario.instrumentos.join(" + ")
                        : "—"}
                    </td>
                    <td>{questionario.versao}</td>
                    <td>{questionario.dominios.length}</td>
                    <td>
                      <span
                        className={`${tabela.selo} ${questionario.ativo ? tabela.seloAtivo : tabela.seloInativo}`}
                      >
                        {questionario.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className={tabela.acoes}>
                      <Button
                        variante="secundario"
                        onClick={() =>
                          setPreview({
                            titulo: questionario.titulo,
                            dominios: questionario.dominios,
                            modoApresentacao: questionario.modo_apresentacao,
                          })
                        }
                      >
                        Pré-visualizar
                      </Button>
                      <Button variante="secundario" onClick={() => handleAlternarAtivo(questionario)}>
                        {questionario.ativo ? "Desativar" : "Ativar"}
                      </Button>
                      <BotaoIcone
                        icone={IconeEditar}
                        rotulo={`Editar ${questionario.titulo}`}
                        onClick={() => handleEditar(questionario)}
                      />
                      <BotaoIcone
                        icone={IconeExcluir}
                        rotulo={`Excluir ${questionario.titulo}`}
                        onClick={() => handlePedirExclusao(questionario)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={tabela.secaoAdmin}>
        <h2>{editandoId ? "Editar questionário" : "Novo questionário"}</h2>

        {!editandoId && sugestaoDisponivel && !mostrarPainelIa && (
          <Button
            type="button"
            variante="secundario"
            className={styles.botaoAbrirPainelIa}
            onClick={() => setMostrarPainelIa(true)}
          >
            <IconeIA className={styles.iconePequenoIa} /> Gerar com IA
          </Button>
        )}

        {!editandoId && sugestaoDisponivel && mostrarPainelIa && (
          <form className={styles.painelIa} onSubmit={handleGerarComIa}>
            <div className={styles.cabecalhoPainelIa}>
              <IconeIA className={styles.iconePequenoIa} />
              <strong>Gerar questionário com IA</strong>
            </div>
            <p className={styles.descricaoPainelIa}>
              Descreva o questionário que você quer — a IA gera um rascunho de domínios e itens
              para você revisar e ajustar abaixo antes de salvar.
            </p>
            <div className={formStyles.campo}>
              <label htmlFor="pedido-ia" className={formStyles.rotulo}>
                O que você precisa?
              </label>
              <textarea
                id="pedido-ia"
                className={formStyles.controle}
                rows={3}
                maxLength={1000}
                value={pedidoIa}
                onChange={(e) => setPedidoIa(e.target.value)}
                placeholder="Ex.: Questionário Karasek sobre sobrecarga de trabalho, com 4 itens por domínio."
                required
              />
            </div>
            <div className={formStyles.campo}>
              <label htmlFor="instrumento-preferido-ia" className={formStyles.rotulo}>
                Instrumento (opcional)
              </label>
              <select
                id="instrumento-preferido-ia"
                className={formStyles.controle}
                value={instrumentoPreferidoIa}
                onChange={(e) => setInstrumentoPreferidoIa(e.target.value)}
              >
                <option value="">Deixe a IA decidir</option>
                {INSTRUMENTOS.map((instrumento) => (
                  <option key={instrumento.valor} value={instrumento.valor}>
                    {instrumento.rotulo}
                  </option>
                ))}
              </select>
            </div>
            {erroIa && (
              <p role="alert" className={styles.erroPainelIa}>
                {erroIa}
              </p>
            )}
            <div className={styles.acoesPainelIa}>
              <Button type="submit" disabled={gerandoIa || !pedidoIa.trim()}>
                {gerandoIa ? "Gerando..." : "Gerar"}
              </Button>
              <Button
                type="button"
                variante="secundario"
                onClick={() => {
                  setMostrarPainelIa(false);
                  setErroIa(null);
                }}
                disabled={gerandoIa}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        <form onSubmit={handleSalvarQuestionario}>
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
            <div className={formStyles.campo}>
              <label htmlFor="modo-apresentacao-questionario" className={formStyles.rotulo}>
                Apresentação dos itens
              </label>
              <select
                id="modo-apresentacao-questionario"
                className={formStyles.controle}
                value={form.modo_apresentacao}
                onChange={(e) => setForm({ ...form, modo_apresentacao: e.target.value })}
              >
                {MODOS_APRESENTACAO.map((modo) => (
                  <option key={modo.valor} value={modo.valor}>
                    {modo.rotulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label>
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />{" "}
            Ativar este questionário (fica disponível para ser vinculado a instituições)
          </label>

          <h3>Domínios</h3>
          <p className={formStyles.textoAjuda}>
            Cada domínio pertence a um instrumento — combine domínios de
            instrumentos diferentes para montar um questionário misto (ex.:
            Karasek + COPSOQ no mesmo formulário).
          </p>
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
                  <label className={formStyles.rotulo}>Instrumento</label>
                  <select
                    className={formStyles.controle}
                    value={dominio.instrumento}
                    onChange={(e) =>
                      atualizarDominio(indiceDominio, { instrumento: e.target.value })
                    }
                  >
                    {INSTRUMENTOS.map((instrumento) => (
                      <option key={instrumento.valor} value={instrumento.valor}>
                        {instrumento.rotulo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={formStyles.campo}>
                  <label className={formStyles.rotulo}>
                    Chave
                    {dominio.instrumento === "karasek" && (
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

          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem" }}>
            <Button type="submit">
              {editandoId ? "Salvar alterações" : "Cadastrar questionário"}
            </Button>
            <Button
              type="button"
              variante="secundario"
              onClick={() =>
                setPreview({
                  titulo: form.titulo,
                  dominios: form.dominios,
                  modoApresentacao: form.modo_apresentacao,
                })
              }
            >
              Pré-visualizar
            </Button>
            {editandoId && (
              <Button type="button" variante="secundario" onClick={handleCancelarEdicao}>
                Cancelar edição
              </Button>
            )}
          </div>
        </form>
      </div>

      <PreviewQuestionario
        aberto={preview !== null}
        onFechar={() => setPreview(null)}
        titulo={preview?.titulo}
        dominios={preview?.dominios ?? []}
        modoApresentacao={preview?.modoApresentacao}
      />

      <ConfirmModal
        aberto={confirmarExclusao !== null}
        titulo={`Excluir "${confirmarExclusao?.titulo ?? ""}"?`}
        perigo
        confirmando={excluindo}
        textoConfirmar="Excluir definitivamente"
        onCancelar={() => setConfirmarExclusao(null)}
        onConfirmar={handleConfirmarExclusao}
      >
        {confirmarExclusao && (
          <>
            <p>
              Esta ação é permanente: {confirmarExclusao.dominios.length} domínio(s) e{" "}
              {confirmarExclusao.dominios.reduce((soma, d) => soma + d.itens.length, 0)}{" "}
              item(ns) deste questionário serão apagados e não podem ser recuperados.
            </p>
            {(() => {
              const vinculadas = instituicoes.filter(
                (i) => i.questionario_id === confirmarExclusao.id
              );
              if (vinculadas.length === 0) return null;
              return (
                <p>
                  <strong>{vinculadas.length}</strong>{" "}
                  {vinculadas.length === 1 ? "instituição está vinculada" : "instituições estão vinculadas"}{" "}
                  a este questionário ({vinculadas.map((i) => i.nome).join(", ")}) e{" "}
                  {vinculadas.length === 1 ? "ficará" : "ficarão"} sem questionário até que
                  você vincule outro.
                </p>
              );
            })()}
            <p>
              Se já houver respostas registradas para este questionário, a exclusão será
              bloqueada — use "Desativar" em vez de excluir.
            </p>
          </>
        )}
        {erroExclusao && (
          <p role="alert" style={{ color: "var(--cor-perigo)" }}>
            {erroExclusao}
          </p>
        )}
      </ConfirmModal>
    </section>
  );
}

// Mesmo desenho de ConfiguracoesPage.jsx:IconeIA — cada arquivo tem seu
// próprio ícone local, seguindo o padrão de ícones já usado no projeto.
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
