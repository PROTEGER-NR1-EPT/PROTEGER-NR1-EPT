import { Outlet, Route, Routes } from "react-router-dom";

import { Footer } from "./components/layout/Footer";
import { Header } from "./components/layout/Header";
import { PublicRoute } from "./routes/PublicRoute";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { LoginPage } from "./pages/auth/LoginPage";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { ConfiguracoesPage } from "./pages/admin/ConfiguracoesPage";
import { DashboardAdmin } from "./pages/admin/DashboardAdmin";
import { ExportacaoPage } from "./pages/admin/ExportacaoPage";
import { InstituicoesPage } from "./pages/admin/InstituicoesPage";
import { LogsPage } from "./pages/admin/LogsPage";
import { PerfilPage } from "./pages/admin/PerfilPage";
import { QuestionariosPage } from "./pages/admin/QuestionariosPage";
import { ResultadosPage } from "./pages/admin/ResultadosPage";
import { UsuariosPage } from "./pages/admin/UsuariosPage";
import { DashboardConsultor } from "./pages/consultor/DashboardConsultor";
import { ResultadosInstituicao } from "./pages/consultor/ResultadosInstituicao";
import { ConfirmacaoPage } from "./pages/publico/ConfirmacaoPage";
import { LandingPage } from "./pages/publico/LandingPage";
import { PaginaInicial } from "./pages/publico/PaginaInicial";
import { PublicFlowLayout } from "./pages/publico/PublicFlowLayout";
import { QuestionarioPage } from "./pages/publico/QuestionarioPage";
import { TclePage } from "./pages/publico/TclePage";

function AppLayout() {
  return (
    <>
      <a href="#conteudo-principal" className="link-pular-conteudo">
        Pular para o conteúdo principal
      </a>
      <Header />
      <main id="conteudo-principal">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

function NaoEncontrada() {
  return (
    <section className="container" style={{ padding: "3rem 0" }}>
      <h1>Página não encontrada</h1>
      <p>
        <a href="/">Voltar ao início</a>
      </p>
    </section>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Página institucional pública — fora do PublicFlowLayout porque
            não participa do fluxo de resposta (não precisa do contexto de
            instituição/setor selecionados). */}
        <Route path="/" element={<PaginaInicial />} />

        {/* Fluxo público de resposta — sem autenticação (regra 1: nunca
            revela instrumento/resultado nestas telas). */}
        <Route element={<PublicFlowLayout />}>
          <Route path="/participar" element={<LandingPage />} />
          <Route path="/tcle" element={<TclePage />} />
          <Route path="/questionario" element={<QuestionarioPage />} />
          <Route path="/confirmacao" element={<ConfirmacaoPage />} />
        </Route>

        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute papeisPermitidos={["consultor"]} />}>
          <Route path="/consultor" element={<DashboardConsultor />} />
          <Route
            path="/consultor/instituicoes/:instituicaoId"
            element={<ResultadosInstituicao />}
          />
        </Route>

        <Route element={<ProtectedRoute papeisPermitidos={["administrador"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardAdmin />} />
            <Route path="resultados" element={<ResultadosPage />} />
            <Route path="instituicoes" element={<InstituicoesPage />} />
            <Route path="questionarios" element={<QuestionariosPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />
            <Route path="exportacao" element={<ExportacaoPage />} />
            <Route path="logs" element={<LogsPage />} />
            <Route path="perfil" element={<PerfilPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  );
}
