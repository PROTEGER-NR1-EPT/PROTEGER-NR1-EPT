import { useEffect, useState } from "react";

import * as adminApi from "../../api/admin";
import { Button } from "../../components/forms/Button";
import { DropdownInstituicao } from "../../components/forms/DropdownInstituicao";
import formStyles from "../../components/forms/FormField.module.css";
import tabela from "../../styles/tabela.module.css";

const INSTITUICAO_VAZIA = { nome: "", uf: "", municipio: "" };
const SETOR_VAZIO = { nome: "" };

export function InstituicoesPage() {
  const [instituicoes, setInstituicoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [novaInstituicao, setNovaInstituicao] = useState(INSTITUICAO_VAZIA);

  const [instituicaoSetores, setInstituicaoSetores] = useState(null);
  const [setores, setSetores] = useState([]);
  const [novoSetor, setNovoSetor] = useState(SETOR_VAZIO);

  async function recarregarInstituicoes() {
    setCarregando(true);
    try {
      setInstituicoes(await adminApi.listarInstituicoes());
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    recarregarInstituicoes();
  }, []);

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

  async function handleCriarInstituicao(evento) {
    evento.preventDefault();
    setErro(null);
    try {
      await adminApi.criarInstituicao(novaInstituicao);
      setNovaInstituicao(INSTITUICAO_VAZIA);
      await recarregarInstituicoes();
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    }
  }

  async function handleAlternarAtivo(instituicao) {
    setErro(null);
    try {
      if (instituicao.ativo) {
        await adminApi.desativarInstituicao(instituicao.id);
      } else {
        await adminApi.editarInstituicao(instituicao.id, { ativo: true });
      }
      await recarregarInstituicoes();
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    }
  }

  async function handleCriarSetor(evento) {
    evento.preventDefault();
    if (!instituicaoSetores) return;
    setErro(null);
    try {
      await adminApi.criarSetor({ instituicao_id: instituicaoSetores.id, ...novoSetor });
      setNovoSetor(SETOR_VAZIO);
      setSetores(await adminApi.listarSetores(instituicaoSetores.id));
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    }
  }

  async function handleAlternarSetorAtivo(setor) {
    setErro(null);
    try {
      await adminApi.editarSetor(setor.id, { ativo: !setor.ativo });
      setSetores(await adminApi.listarSetores(instituicaoSetores.id));
    } catch (erroApi) {
      setErro(erroApi.mensagem);
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

      <div className={tabela.secaoAdmin}>
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
                      <span
                        className={`${tabela.selo} ${instituicao.ativo ? tabela.seloAtivo : tabela.seloInativo}`}
                      >
                        {instituicao.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className={tabela.acoes}>
                      <Button
                        variante="secundario"
                        onClick={() => handleAlternarAtivo(instituicao)}
                      >
                        {instituicao.ativo ? "Desativar" : "Reativar"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3>Nova instituição</h3>
        <form onSubmit={handleCriarInstituicao} style={{ maxWidth: "28rem" }}>
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
          <Button type="submit">Cadastrar instituição</Button>
        </form>
      </div>

      <div className={tabela.secaoAdmin}>
        <h2>Setores</h2>
        <p>Selecione uma instituição para ver e gerenciar seus setores.</p>
        <DropdownInstituicao
          value={instituicaoSetores?.id}
          onChange={setInstituicaoSetores}
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
                          <Button
                            variante="secundario"
                            onClick={() => handleAlternarSetorAtivo(setor)}
                          >
                            {setor.ativo ? "Desativar" : "Reativar"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <form onSubmit={handleCriarSetor} style={{ maxWidth: "28rem" }}>
              <div className={formStyles.campo}>
                <label htmlFor="nome-setor" className={formStyles.rotulo}>
                  Novo setor em {instituicaoSetores.nome}
                </label>
                <input
                  id="nome-setor"
                  className={formStyles.controle}
                  value={novoSetor.nome}
                  onChange={(e) => setNovoSetor({ nome: e.target.value })}
                  required
                />
              </div>
              <Button type="submit">Cadastrar setor</Button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
