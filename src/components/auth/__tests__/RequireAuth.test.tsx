import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import { RequireAuth } from "@/components/auth/RequireAuth";

// Mock do AuthContext usado pelo RequireAuth
const authState = {
  user: null as null | { id: string },
  isLoading: false,
  masterSession: null as string | null,
  isMaster: false,
  userRole: null as null | "user" | "admin" | "master",
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

const DashboardStub = () => <div>DASHBOARD_SECRETO</div>;
const MasterStub = () => (
  <div>
    <h1>Painel Master</h1>
    <button>Ação Master</button>
    <a href="/master/danger">Zona Perigosa</a>
  </div>
);
const HomeStub = () => <div>HOME_PUBLICA</div>;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<HomeStub />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth mode="block">
              <DashboardStub />
            </RequireAuth>
          }
        />
        <Route
          path="/agent-panel"
          element={
            <RequireAuth mode="block">
              <div>PAINEL_SECRETO</div>
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth mode="block">
              <div>CONFIG_SECRETO</div>
            </RequireAuth>
          }
        />
        <Route
          path="/master"
          element={
            <RequireAuth mode="block" requireMaster>
              <MasterStub />
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}


describe("RequireAuth — guards de rota", () => {
  beforeEach(() => {
    authState.user = null;
    authState.isLoading = false;
    authState.masterSession = null;
    authState.isMaster = false;
    authState.userRole = null;
  });

  it("visitante não autenticado NÃO renderiza /dashboard e vê Área Restrita (acesso direto por URL)", () => {
    renderAt("/dashboard");
    expect(screen.queryByText("DASHBOARD_SECRETO")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Área Restrita/i)).toBeInTheDocument();
  });

  it.each([
    ["/agent-panel", "PAINEL_SECRETO"],
    ["/settings", "CONFIG_SECRETO"],
  ])("acesso direto a %s bloqueia render e exibe Área Restrita", (path, secret) => {
    renderAt(path);
    expect(screen.queryByText(secret)).not.toBeInTheDocument();
    expect(screen.getByText(/Área Restrita/i)).toBeInTheDocument();
  });


  it("visitante não autenticado NÃO renderiza /master e vê mensagem de Área Restrita", () => {
    renderAt("/master");
    expect(screen.queryByText("Painel Master")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ação Master/i })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Área Restrita/i)).toBeInTheDocument();
  });

  it("usuário autenticado acessa /dashboard normalmente", () => {
    authState.user = { id: "u1" };
    authState.userRole = "user";
    renderAt("/dashboard");
    expect(screen.getByText("DASHBOARD_SECRETO")).toBeInTheDocument();
  });

  it("usuário master autenticado acessa /master normalmente", () => {
    authState.user = { id: "u1" };
    authState.userRole = "master";
    authState.isMaster = true;
    renderAt("/master");
    expect(screen.getByText("Painel Master")).toBeInTheDocument();
  });

  it("usuário autenticado SEM papel master NÃO acessa /master (bloqueado)", () => {
    authState.user = { id: "u1" };
    authState.userRole = "admin";
    authState.isMaster = false;
    renderAt("/master");
    expect(screen.queryByText("Painel Master")).not.toBeInTheDocument();
    expect(screen.getByText(/Acesso Master Exclusivo/i)).toBeInTheDocument();
  });

  it("sessão master (edge function) acessa /master mesmo sem user Supabase", () => {
    authState.user = null;
    authState.masterSession = "franc";
    renderAt("/master");
    expect(screen.getByText("Painel Master")).toBeInTheDocument();
  });

  it("durante carregamento inicial não expõe conteúdo protegido nem redireciona", () => {
    authState.user = null;
    authState.isLoading = true;
    authState.masterSession = null;

    renderAt("/dashboard");

    expect(screen.queryByText("DASHBOARD_SECRETO")).not.toBeInTheDocument();
    expect(screen.queryByText("HOME_PUBLICA")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("/master: visitante não vê nenhum botão nem link do painel na DOM", () => {
    authState.user = null;
    authState.isLoading = false;
    authState.masterSession = null;

    renderAt("/master");

    // Nenhum controle interativo do painel Master deve estar presente.
    expect(screen.queryByRole("button", { name: /Ação Master/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Zona Perigosa/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Painel Master/i })).not.toBeInTheDocument();

    // Apenas os controles institucionais da RestrictedArea existem.
    const buttons = screen.getAllByRole("button");
    const buttonNames = buttons.map((b) => b.textContent?.trim().toLowerCase() ?? "");
    for (const name of buttonNames) {
      expect(name).toMatch(/voltar|entrar/);
    }
  });

  it("/master: RestrictedArea mostra avisos institucionais das unidades do Acre", () => {
    authState.user = null;
    authState.isLoading = false;
    authState.masterSession = null;

    renderAt("/master");

    expect(screen.getByText(/Painel Institucional/i)).toBeInTheDocument();
    expect(screen.getByText(/Unidades do Acre/i)).toBeInTheDocument();
    expect(screen.getByText(/ISE Rio Branco/i)).toBeInTheDocument();
    expect(screen.getByText(/ISE Feijó/i)).toBeInTheDocument();
  });
});
