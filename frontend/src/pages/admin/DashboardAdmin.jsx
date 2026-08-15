import { useAuth } from "../../hooks/useAuth";

export function DashboardAdmin() {
  const { usuario } = useAuth();

  return (
    <section>
      <h1>Painel do Administrador</h1>
      <p>
        Olá, {usuario?.nome}. Use a navegação acima para gerenciar
        instituições, setores, questionários, usuários, configurações do
        sistema, exportação de dados e o log de atividade.
      </p>
    </section>
  );
}
