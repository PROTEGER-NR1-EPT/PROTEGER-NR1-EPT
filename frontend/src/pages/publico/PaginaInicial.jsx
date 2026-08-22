// Copyright PROTEGER-NR1 EPT (https://github.com/PROTEGER-NR1-EPT/PROTEGER-NR1-EPT)
// Licenciado sob PolyForm Noncommercial 1.0.0 — veja o arquivo LICENSE na raiz do projeto.

import { useNavigate } from "react-router-dom";

import { Button } from "../../components/forms/Button";
import styles from "./PaginaInicial.module.css";

// Página institucional pública (fora do PublicFlowLayout — regra 2 do
// prompt de implementação: não participa do fluxo de resposta, não
// precisa do contexto de instituição/setor selecionados). Nunca revela o
// nome dos instrumentos (Karasek/COPSOQ) nem cálculo de resultado, mesma
// regra do restante do fluxo público (docs/04).
const PROBLEMAS = [
  {
    titulo: "Sobrecarga de trabalho docente",
    texto:
      "Jornadas extensas, acúmulo de funções e pressão por resultados afetam diretamente o bem-estar de quem ensina.",
  },
  {
    titulo: "Esgotamento emocional",
    texto:
      "Lidar diariamente com as demandas de estudantes, famílias e da própria instituição cobra um preço emocional que raramente é medido.",
  },
  {
    titulo: "Ausência de registro institucional",
    texto:
      "Sem um instrumento próprio, riscos psicossociais tendem a ficar invisíveis até já terem gerado afastamentos ou adoecimento.",
  },
  {
    titulo: "NR-1 pouco adaptada à escola",
    texto:
      "A norma exige identificação e gestão desses riscos, mas poucos instrumentos foram pensados para a realidade da Educação Profissional e Tecnológica.",
  },
];

const PASSOS = [
  {
    titulo: "Selecione sua instituição e setor",
    texto: "Escolha, em poucos cliques, a instituição de ensino e o setor ao qual você pertence.",
  },
  {
    titulo: "Responda ao questionário, de forma 100% anônima",
    texto:
      "As perguntas levam poucos minutos e nenhuma informação identificável é solicitada em nenhuma etapa.",
  },
  {
    titulo: "Os resultados agregados apoiam a gestão da escola na prevenção",
    texto:
      "As respostas viram indicadores agregados por instituição e setor, para apoiar a prevenção de riscos psicossociais.",
  },
];

const PRIVACIDADE = [
  "Nenhum dado que identifique você é coletado — sem nome, e-mail, matrícula ou qualquer informação parecida.",
  "Os resultados só aparecem agregados por grupo (instituição e setor), nunca associados a uma pessoa.",
  "Para proteger ainda mais o anonimato, resultados de grupos muito pequenos não são exibidos — só passam a aparecer quando há respostas suficientes para que ninguém possa ser identificado indiretamente.",
  "O sistema segue a Lei Geral de Proteção de Dados (LGPD).",
  "Este é um projeto de pesquisa de mestrado profissional (ProfEPT/IFRJ): os dados são usados exclusivamente para fins acadêmicos e para apoiar a gestão da própria instituição, nunca para fins comerciais.",
];

const PERGUNTAS = [
  {
    pergunta: "Minhas respostas podem ser identificadas?",
    resposta:
      "Não. O questionário não pede nome, e-mail, matrícula ou qualquer dado pessoal, e as respostas nunca são associadas a quem as enviou.",
  },
  {
    pergunta: "Quanto tempo leva para responder?",
    resposta:
      "Poucos minutos — o questionário foi pensado para ser rápido e direto, sem etapas desnecessárias.",
  },
  {
    pergunta: "Os resultados ficam disponíveis para quem?",
    resposta:
      "Somente para Consultores vinculados à instituição e para a Administração do sistema, sempre em formato agregado — nunca resposta por resposta. Resultados de grupos muito pequenos ficam ocultos até haver respostas suficientes para preservar o anonimato.",
  },
  {
    pergunta: "Este é um sistema comercial?",
    resposta:
      "Não. É um produto educacional, desenvolvido como pesquisa de mestrado profissional, sem fins lucrativos e sem planos pagos. Qualquer instituição de Educação Profissional e Tecnológica pode utilizá-lo.",
  },
];

function IconeCadeado() {
  return (
    <svg viewBox="0 0 24 24" className={styles.iconeCadeado} aria-hidden="true" focusable="false">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" strokeWidth="2" />
    </svg>
  );
}

function IconeAcademico() {
  return (
    <svg
      viewBox="0 0 24 24"
      className={styles.iconeAcademico}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 8 12 3 22 8 12 13 2 8Z" strokeLinejoin="round" />
      <path d="M6 10v4c0 1.66 2.69 3 6 3s6-1.34 6-3v-4" />
      <path d="M22 8v6" strokeLinecap="round" />
    </svg>
  );
}

export function PaginaInicial() {
  const navigate = useNavigate();

  function irParaParticipar() {
    navigate("/participar");
  }

  return (
    <>
      <section className={styles.hero}>
        <div className={`container ${styles.heroConteudo}`}>
          <div className={styles.heroTexto}>
            <h1 className={styles.heroTitulo}>
              Cuidando da saúde mental na Educação Profissional e Tecnológica
            </h1>
            <p className={styles.heroSubtitulo}>
              O PROTEGER-NR1 EPT ajuda instituições de ensino a identificar e prevenir riscos
              psicossociais no trabalho, atendendo à NR-1 e apoiando a gestão escolar com dados
              agregados e anônimos.
            </p>
            <Button className={styles.botaoHero} onClick={irParaParticipar}>
              Participar da pesquisa
            </Button>
            <p className={styles.heroNota}>
              Leva poucos minutos. Nenhuma informação identificável é solicitada.
            </p>
          </div>
          <img
            src="/logo.png"
            alt="PROTEGER-NR1 EPT — Promovendo ambientes escolares mais saudáveis, seguros e humanos"
            className={styles.heroLogo}
          />
        </div>
      </section>

      <section className={styles.secao}>
        <div className="container">
          <h2 className={styles.tituloSecao}>Por que isso importa</h2>
          <p className={styles.introducaoSecao}>
            Segundo a Organização Mundial da Saúde, transtornos de ansiedade e depressão custam à
            economia global cerca de um trilhão de dólares por ano em perda de produtividade — e o
            ambiente escolar não está imune a esse quadro.
          </p>
          <div className={styles.grade}>
            {PROBLEMAS.map((problema) => (
              <div key={problema.titulo} className={styles.cartao}>
                <h3 className={styles.tituloCartao}>{problema.titulo}</h3>
                <p className={styles.textoCartao}>{problema.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.secao} ${styles.secaoAlt}`}>
        <div className="container">
          <h2 className={styles.tituloSecao}>Como funciona</h2>
          <ol className={styles.listaPassos}>
            {PASSOS.map((passo, indice) => (
              <li key={passo.titulo} className={styles.passo}>
                <span className={styles.numeroPasso} aria-hidden="true">
                  {indice + 1}
                </span>
                <div>
                  <h3 className={styles.tituloPasso}>{passo.titulo}</h3>
                  <p className={styles.textoCartao}>{passo.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.secao}>
        <div className="container">
          <div className={styles.blocoPrivacidade}>
            <IconeCadeado />
            <div>
              <h2 className={styles.tituloSecao}>Como cuidamos dos seus dados</h2>
              <ul className={styles.listaPrivacidade}>
                {PRIVACIDADE.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.secao} ${styles.secaoAlt}`}>
        <div className="container">
          <div className={styles.blocoSobre}>
            <IconeAcademico />
            <div>
              <h2 className={styles.tituloSecao}>Sobre o projeto</h2>
              <p className={styles.paragrafoSobre}>
                O PROTEGER-NR1 EPT nasceu como pesquisa-ação de um Mestrado Profissional em
                Educação Profissional e Tecnológica (ProfEPT), desenvolvida na CIEP 052 – E-Tec
                Professora Romanda Gouveia Gonçalves.
              </p>
              <p className={styles.paragrafoSobre}>
                A proposta une a NR-1, estudos sobre saúde mental no trabalho e a construção de
                uma memória institucional — um histórico que permite às escolas acompanhar sua
                própria evolução ao longo do tempo. O objetivo é oferecer uma ferramenta
                replicável, gratuita e de uso educacional para qualquer instituição de Educação
                Profissional e Tecnológica que queira dar esse passo.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.secao}>
        <div className="container">
          <h2 className={styles.tituloSecao}>Perguntas frequentes</h2>
          <div className={styles.faq}>
            {PERGUNTAS.map((item) => (
              <details key={item.pergunta} className={styles.faqItem}>
                <summary className={styles.faqPergunta}>{item.pergunta}</summary>
                <p className={styles.faqResposta}>{item.resposta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.secao} ${styles.ctaFinal}`}>
        <div className="container">
          <h2 className={styles.tituloCta}>Ajude sua instituição a prevenir riscos psicossociais</h2>
          <p className={styles.ctaNota}>
            Participação anônima, gratuita e sem fins comerciais — leva poucos minutos.
          </p>
          <Button variante="secundario" className={styles.botaoHero} onClick={irParaParticipar}>
            Participar da pesquisa
          </Button>
        </div>
      </section>
    </>
  );
}
