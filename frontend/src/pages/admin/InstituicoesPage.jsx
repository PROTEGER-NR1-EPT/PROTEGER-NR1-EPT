// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useEffect, useState } from "react";

import * as adminApi from "../../api/admin";
import { BotaoIcone } from "../../components/common/BotaoIcone";
import { Button } from "../../components/forms/Button";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { DropdownInstituicao } from "../../components/forms/DropdownInstituicao";
import { IconeEditar, IconeExcluir } from "../../components/common/icones";
import formStyles from "../../components/forms/FormField.module.css";
import tabela from "../../styles/tabela.module.css";
import styles from "./InstituicoesPage.module.css";

const INSTITUICAO_VAZIA = { nome: "", uf: "", municipio: "", questionario_id: "" };
const SETOR_VAZIO = { nome: "" };

const ABAS = [
  { valor: "instituicoes", rotulo: "Instituições" },
  { valor: "setores", rotulo: "Setores" },
];

export function InstituicoesPage() {
  const [abaAtiva, setAbaAtiva] = useState("instituicoes");
  const [instituicoes, setInstituicoes] = useState([]);
  const [questionarios, setQuestionarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [novaInstituicao, setNovaInstituicao] = useState(INSTITUICAO_VAZIA);
  const [editandoInstituicaoId, setEditandoInstituicaoId] = useState(null);
  const [confirmarDesativarInstituicao, setConfirmarDesativarInstituicao] = useState(null);
  const [desativandoInstituicao, setDesativandoInstituicao] = useState(false);
  const [erroModalInstituicao, setErroModalInstituicao] = useState(null);

  const [instituicaoSetores, setInstituicaoSetores] = useState(null);
  const [setores, setSetores] = useState([]);
  const [novoSetor, setNovoSetor] = useState(SETOR_VAZIO);
  const [editandoSetorId, setEditandoSetorId] = useState(null);
  const [confirmarDesativarSetor, setConfirmarDesativarSetor] = useState(null);
  const [desativandoSetor, setDesativandoSetor] = useState(false);
  const [erroModalSetor, setErroModalSetor] = useState(null);

  async function recarregarInstituicoes() {
    setCarregando(true);
    try {
      const [listaInstituicoes, listaQuestionarios] = await Promise.all([
        adminApi.listarInstituicoes(),
        adminApi.listarQuestionarios(),
      ]);
      setInstituicoes(listaInstituicoes);
      setQuestionarios(listaQuestionarios);
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    recarregarInstituicoes();
  }, []);

  const questionariosAtivos = questionarios.filter((q) => q.ativo);

  async function handleAlterarQuestionarioVinculado(instituicao, questionarioId) {
    setErro(null);
    try {
      await adminApi.editarInstituicao(instituicao.id, {
        questionario_id: questionarioId ? Number(questionarioId) : null,
      });
      await recarregarInstituicoes();
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    }
  }

  useEffect(() => {
    if (!instituicaoSetores) {
      setSetores([]);
      return;
    }
    adminApi
      .listarSetores(instituicaoSetores.id)
      .then(setSetores)
      .catch((erroApi) => setErro(erroApi.mensagem));
  }, [instituicaoSetores]);

  function handleEditarInstituicao(instituicao) {
    setErro(null);
    setEditandoInstituicaoId(instituicao.id);
    setNovaInstituicao({
      nome: instituicao.nome,
      uf: instituicao.uf ?? "",
      municipio: instituicao.municipio ?? "",
      questionario_id: instituicao.questionario_id ?? "",
    });
  }

  function handleCancelarEdicaoInstituicao() {
    setEditandoInstituicaoId(null);
    setNovaInstituicao(INSTITUICAO_VAZIA);
  }

  async function handleSalvarInstituicao(evento) {
    evento.preventDefault();
    setErro(null);
    try {
      const payload = {
        ...novaInstituicao,
        questionario_id: novaInstituicao.questionario_id
          ? Number(novaInstituicao.questionario_id)
          : null,
      };
      if (editandoInstituicaoId) {
        await adminApi.editarInstituicao(editandoInstituicaoId, payload);
        setEditandoInstituicaoId(null);
      } else {
        await adminApi.criarInstituicao(payload);
      }
      setNovaInstituicao(INSTITUICAO_VAZIA);
      await recarregarInstituicoes();
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    }
  }

  async function handleReativarInstituicao(instituicao) {
    setErro(null);
    try {
      await adminApi.editarInstituicao(instituicao.id, { ativo: true });
      await recarregarInstituicoes();
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    }
  }

  async function handleConfirmarDesativacaoInstituicao() {
    if (!confirmarDesativarInstituicao) return;
    setDesativandoInstituicao(true);
    setErroModalInstituicao(null);
    try {
      await adminApi.desativarInstituicao(confirmarDesativarInstituicao.id);
      setConfirmarDesativarInstituicao(null);
      await recarregarInstituicoes();
    } catch (erroApi) {
      setErroModalInstituicao(erroApi.mensagem);
    } finally {
      setDesativandoInstituicao(false);
    }
  }

  function handleEditarSetor(setor) {
    setErro(null);
    setEditandoSetorId(setor.id);
    setNovoSetor({ nome: setor.nome });
  }

  function handleCancelarEdicaoSetor() {
    setEditandoSetorId(null);
    setNovoSetor(SETOR_VAZIO);
  }

  async function handleSalvarSetor(evento) {
    evento.preventDefault();
    if (!instituicaoSetores) return;
    setErro(null);
    try {
      if (editandoSetorId) {
        await adminApi.editarSetor(editandoSetorId, { nome: novoSetor.nome });
        setEditandoSetorId(null);
      } else {
        await adminApi.criarSetor({ instituicao_id: instituicaoSetores.id, ...novoSetor });
      }
      setNovoSetor(SETOR_VAZIO);
      setSetores(await adminApi.listarSetores(instituicaoSetores.id));
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    }
  }

  async function handleReativarSetor(setor) {
    setErro(null);
    try {
      await adminApi.editarSetor(setor.id, { ativo: true });
      setSetores(await adminApi.listarSetores(instituicaoSetores.id));
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    }
  }

  async function handleConfirmarDesativacaoSetor() {
    if (!confirmarDesativarSetor) return;
    setDesativandoSetor(true);
    setErroModalSetor(null);
    try {
      await adminApi.editarSetor(confirmarDesativarSetor.id, { ativo: false });
      setConfirmarDesativarSetor(null);
      setSetores(await adminApi.listarSetores(instituicaoSetores.id));
    } catch (erroApi) {
      setErroModalSetor(erroApi.mensagem);
    } finally {
      setDesativandoSetor(false);
    }
  }

  return (
    <section>
      <h1>Instituições e setores</h1>
      {erro && (
        <p role="alert" style={{ color: "var(--cor-perigo)" }}>
          {erro}
        </p>
      )}

      <div className={styles.abas} role="tablist" aria-label="Categorias de instituições">
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

      <div
        className={`${styles.cartao} ${styles.cartaoLargo}`}
        hidden={abaAtiva !== "instituicoes"}
      >
        <h2>Instituições cadastradas</h2>
        {carregando ? (
          <p>Carregando...</p>
        ) : instituicoes.length === 0 ? (
          <p className={tabela.semDados}>Nenhuma instituição cadastrada ainda.</p>
        ) : (
          <div className={tabela.envoltorioTabela}>
            <table className={tabela.tabela}>
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">UF</th>
                  <th scope="col">Município</th>
                  <th scope="col">Questionário vinculado</th>
                  <th scope="col">Status</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {instituicoes.map((instituicao) => (
                  <tr key={instituicao.id}>
                    <td>{instituicao.nome}</td>
                    <td>{instituicao.uf}</td>
                    <td>{instituicao.municipio}</td>
                    <td>
                      <select
                        className={formStyles.controle}
                        value={instituicao.questionario_id ?? ""}
                        onChange={(e) =>
                          handleAlterarQuestionarioVinculado(instituicao, e.target.value)
                        }
                        aria-label={`Questionário vinculado a ${instituicao.nome}`}
                      >
                        <option value="">Nenhum</option>
                        {questionariosAtivos.map((questionario) => (
                          <option key={questionario.id} value={questionario.id}>
                            {questionario.titulo}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span
                        className={`${tabela.selo} ${instituicao.ativo ? tabela.seloAtivo : tabela.seloInativo}`}
                      >
                        {instituicao.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className={tabela.acoes}>
                      <BotaoIcone
                        icone={IconeEditar}
                        rotulo={`Editar ${instituicao.nome}`}
                        onClick={() => handleEditarInstituicao(instituicao)}
                      />
                      {instituicao.ativo ? (
                        <BotaoIcone
                          icone={IconeExcluir}
                          rotulo={`Desativar ${instituicao.nome}`}
                          onClick={() => setConfirmarDesativarInstituicao(instituicao)}
                        />
                      ) : (
                        <Button
                          variante="secundario"
                          onClick={() => handleReativarInstituicao(instituicao)}
                        >
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

        <h3>{editandoInstituicaoId ? "Editar instituição" : "Nova instituição"}</h3>
        <form onSubmit={handleSalvarInstituicao} style={{ maxWidth: "28rem" }}>
          <div className={formStyles.campo}>
            <label htmlFor="nome-instituicao" className={formStyles.rotulo}>
              Nome
            </label>
            <input
              id="nome-instituicao"
              className={formStyles.controle}
              value={novaInstituicao.nome}
              onChange={(e) => setNovaInstituicao({ ...novaInstituicao, nome: e.target.value })}
              required
            />
          </div>
          <div className={formStyles.campo}>
            <label htmlFor="uf-instituicao" className={formStyles.rotulo}>
              UF
            </label>
            <input
              id="uf-instituicao"
              className={formStyles.controle}
              maxLength={2}
              value={novaInstituicao.uf}
              onChange={(e) =>
                setNovaInstituicao({ ...novaInstituicao, uf: e.target.value.toUpperCase() })
              }
            />
          </div>
          <div className={formStyles.campo}>
            <label htmlFor="municipio-instituicao" className={formStyles.rotulo}>
              Município
            </label>
            <input
              id="municipio-instituicao"
              className={formStyles.controle}
              value={novaInstituicao.municipio}
              onChange={(e) =>
                setNovaInstituicao({ ...novaInstituicao, municipio: e.target.value })
              }
            />
          </div>
          <div className={formStyles.campo}>
            <label htmlFor="questionario-instituicao" className={formStyles.rotulo}>
              Questionário vinculado
            </label>
            <select
              id="questionario-instituicao"
              className={formStyles.controle}
              value={novaInstituicao.questionario_id}
              onChange={(e) =>
                setNovaInstituicao({ ...novaInstituicao, questionario_id: e.target.value })
              }
            >
              <option value="">Nenhum (definir depois)</option>
              {questionariosAtivos.map((questionario) => (
                <option key={questionario.id} value={questionario.id}>
                  {questionario.titulo}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button type="submit">
              {editandoInstituicaoId ? "Salvar alterações" : "Cadastrar instituição"}
            </Button>
            {editandoInstituicaoId && (
              <Button
                type="button"
                variante="secundario"
                onClick={handleCancelarEdicaoInstituicao}
              >
                Cancelar edição
              </Button>
            )}
          </div>
        </form>
      </div>

      <div
        className={`${styles.cartao} ${styles.cartaoLargo}`}
        hidden={abaAtiva !== "setores"}
      >
        <h2>Setores</h2>
        <p>Selecione uma instituição para ver e gerenciar seus setores.</p>
        <DropdownInstituicao
          value={instituicaoSetores?.id}
          onChange={(nova) => {
            setInstituicaoSetores(nova);
            setEditandoSetorId(null);
            setNovoSetor(SETOR_VAZIO);
          }}
          carregarInstituicoes={adminApi.listarInstituicoes}
        />

        {instituicaoSetores && (
          <>
            {setores.length === 0 ? (
              <p className={tabela.semDados}>
                Nenhum setor cadastrado em {instituicaoSetores.nome} ainda.
              </p>
            ) : (
              <div className={tabela.envoltorioTabela}>
                <table className={tabela.tabela}>
                  <thead>
                    <tr>
                      <th scope="col">Nome</th>
                      <th scope="col">Status</th>
                      <th scope="col">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {setores.map((setor) => (
                      <tr key={setor.id}>
                        <td>{setor.nome}</td>
                        <td>
                          <span
                            className={`${tabela.selo} ${setor.ativo ? tabela.seloAtivo : tabela.seloInativo}`}
                          >
                            {setor.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className={tabela.acoes}>
                          <BotaoIcone
                            icone={IconeEditar}
                            rotulo={`Editar ${setor.nome}`}
                            onClick={() => handleEditarSetor(setor)}
                          />
                          {setor.ativo ? (
                            <BotaoIcone
                              icone={IconeExcluir}
                              rotulo={`Desativar ${setor.nome}`}
                              onClick={() => setConfirmarDesativarSetor(setor)}
                            />
                          ) : (
                            <Button
                              variante="secundario"
                              onClick={() => handleReativarSetor(setor)}
                            >
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

            <form onSubmit={handleSalvarSetor} style={{ maxWidth: "28rem" }}>
              <div className={formStyles.campo}>
                <label htmlFor="nome-setor" className={formStyles.rotulo}>
                  {editandoSetorId
                    ? `Editar setor de ${instituicaoSetores.nome}`
                    : `Novo setor em ${instituicaoSetores.nome}`}
                </label>
                <input
                  id="nome-setor"
                  className={formStyles.controle}
                  value={novoSetor.nome}
                  onChange={(e) => setNovoSetor({ nome: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Button type="submit">
                  {editandoSetorId ? "Salvar alterações" : "Cadastrar setor"}
                </Button>
                {editandoSetorId && (
                  <Button type="button" variante="secundario" onClick={handleCancelarEdicaoSetor}>
                    Cancelar edição
                  </Button>
                )}
              </div>
            </form>
          </>
        )}
      </div>

      <ConfirmModal
        aberto={confirmarDesativarInstituicao !== null}
        titulo={`Desativar "${confirmarDesativarInstituicao?.nome ?? ""}"?`}
        perigo
        confirmando={desativandoInstituicao}
        textoConfirmar="Desativar"
        onCancelar={() => {
          setConfirmarDesativarInstituicao(null);
          setErroModalInstituicao(null);
        }}
        onConfirmar={handleConfirmarDesativacaoInstituicao}
      >
        <p>
          A instituição deixa de aparecer no formulário público e nos
          dropdowns de vínculo — respostas e resultados já registrados são
          preservados, e você pode reativá-la a qualquer momento.
        </p>
        {erroModalInstituicao && (
          <p role="alert" style={{ color: "var(--cor-perigo)" }}>
            {erroModalInstituicao}
          </p>
        )}
      </ConfirmModal>

      <ConfirmModal
        aberto={confirmarDesativarSetor !== null}
        titulo={`Desativar "${confirmarDesativarSetor?.nome ?? ""}"?`}
        perigo
        confirmando={desativandoSetor}
        textoConfirmar="Desativar"
        onCancelar={() => {
          setConfirmarDesativarSetor(null);
          setErroModalSetor(null);
        }}
        onConfirmar={handleConfirmarDesativacaoSetor}
      >
        <p>
          O setor deixa de aparecer nos dropdowns do formulário público —
          respostas já registradas são preservadas, e você pode reativá-lo
          a qualquer momento.
        </p>
        {erroModalSetor && (
          <p role="alert" style={{ color: "var(--cor-perigo)" }}>
            {erroModalSetor}
          </p>
        )}
      </ConfirmModal>
    </section>
  );
}
