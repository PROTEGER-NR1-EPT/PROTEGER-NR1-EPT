import { useEffect, useState } from "react";

import * as adminApi from "../../api/admin";
import { Button } from "../../components/forms/Button";
import { DropdownInstituicao } from "../../components/forms/DropdownInstituicao";
import { DropdownSetor } from "../../components/forms/DropdownSetor";
import formStyles from "../../components/forms/FormField.module.css";
import tabela from "../../styles/tabela.module.css";

export function ExportacaoPage() {
  const [instituicao, setInstituicao] = useState(null);
  const [setor, setSetor] = useState(null);
  const [questionarioId, setQuestionarioId] = useState("");
  const [questionarios, setQuestionarios] = useState([]);
  const [confirmado, setConfirmado] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState(null);
  const [mensagem, setMensagem] = useState(null);

  useEffect(() => {
    adminApi.listarQuestionarios().then(setQuestionarios).catch(() => {});
  }, []);

  // Nunca dispara a exportação sozinho ao entrar na tela (regra 5) — só
  // roda quando o Administrador clica no botão, depois de marcar o
  // checkbox de confirmação.
  async function handleExportar(evento) {
    evento.preventDefault();
    if (!confirmado) return;
    setExportando(true);
    setErro(null);
    setMensagem(null);
    try {
      const { blob, nomeArquivo } = await adminApi.exportarRespostasCsv({
        instituicaoId: instituicao?.id,
        setorId: setor?.id,
        questionarioId: questionarioId || undefined,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setMensagem("Exportação concluída — verifique os downloads do navegador.");
      setConfirmado(false);
    } catch (erroApi) {
      setErro(erroApi.mensagem);
    } finally {
      setExportando(false);
    }
  }

  return (
    <section>
      <h1>Exportação de respostas brutas</h1>

      <div
        className={tabela.secaoAdmin}
        style={{
          background: "var(--cor-perigo-fundo)",
          color: "var(--cor-perigo)",
          padding: "1rem",
          borderRadius: "var(--raio-borda)",
        }}
      >
        <p>
          <strong>Aviso de sensibilidade dos dados.</strong> Esta
          exportação contorna o filtro de k-anonimato do dashboard: o CSV
          contém uma linha por resposta individual (desagregada). Embora
          não tenha nome, e-mail ou qualquer identificador direto, esses
          dados são considerados sensíveis pela LGPD e podem ser
          reidentificáveis por cruzamento (ex.: setor muito pequeno). A
          guarda e o uso do arquivo exportado são de sua responsabilidade.
          Esta exportação fica registrada no log de atividade.
        </p>
      </div>

      <form onSubmit={handleExportar} style={{ maxWidth: "28rem" }}>
        <h2>Filtros (opcionais)</h2>
        <DropdownInstituicao
          value={instituicao?.id}
          onChange={(nova) => {
            setInstituicao(nova);
            setSetor(null);
          }}
          carregarInstituicoes={adminApi.listarInstituicoes}
        />
        <DropdownSetor
          instituicaoId={instituicao?.id}
          value={setor?.id}
          onChange={setSetor}
          carregarSetores={adminApi.listarSetores}
        />
        <div className={formStyles.campo}>
          <label htmlFor="questionario-export" className={formStyles.rotulo}>
            Questionário
          </label>
          <select
            id="questionario-export"
            className={formStyles.controle}
            value={questionarioId}
            onChange={(e) => setQuestionarioId(e.target.value)}
          >
            <option value="">Todos</option>
            {questionarios.map((questionario) => (
              <option key={questionario.id} value={questionario.id}>
                {questionario.titulo}
              </option>
            ))}
          </select>
        </div>

        <label style={{ display: "block", margin: "1rem 0" }}>
          <input
            type="checkbox"
            checked={confirmado}
            onChange={(e) => setConfirmado(e.target.checked)}
          />{" "}
          Estou ciente da sensibilidade destes dados e confirmo a
          exportação.
        </label>

        {erro && (
          <p role="alert" style={{ color: "var(--cor-perigo)" }}>
            {erro}
          </p>
        )}
        {mensagem && <p role="status">{mensagem}</p>}

        <Button type="submit" disabled={!confirmado || exportando}>
          {exportando ? "Exportando..." : "Exportar CSV"}
        </Button>
      </form>
    </section>
  );
}
