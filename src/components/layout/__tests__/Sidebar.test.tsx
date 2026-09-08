import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import { Sidebar } from "@/components/layout/Sidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";

const authState = {
  user: null as null | { id: string },
  isLoading: false,
  masterSession: null as string | null,
  isMaster: false,
  userRole: null as null | string,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

function renderDesktop() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Sidebar />} />
        <Route path="/dashboard" element={<div>DASHBOARD_SECRETO</div>} />
        <Route path="/agent-panel" element={<div>PAINEL_SECRETO</div>} />
        <Route path="/settings" element={<div>CONFIG_SECRETO</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderMobile() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<MobileSidebar onNavigate={() => {}} />} />
        <Route path="/dashboard" element={<div>DASHBOARD_SECRETO</div>} />
        <Route path="/agent-panel" element={<div>PAINEL_SECRETO</div>} />
        <Route path="/settings" element={<div>CONFIG_SECRETO</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const protectedLabels = [
  "Dashboard",
  "Meu Painel",
  "Agentes",
  "Banco de Horas",
  "Configurações",
];

describe("Sidebar (desktop) — guards de navegação", () => {
  beforeEach(() => {
    authState.user = null;
    authState.isLoading = false;
    authState.masterSession = null;
    authState.isMaster = false;
    authState.userRole = null;
  });

  it.each(protectedLabels)(
    "visitante clica em '%s' e vê RestrictedAccessDialog sem navegar",
    (label) => {
      renderDesktop();
      const link = screen.getByRole("link", { name: new RegExp(label, "i") });
      fireEvent.click(link);

      // Nenhum conteúdo protegido renderizado
      expect(screen.queryByText(/DASHBOARD_SECRETO/)).not.toBeInTheDocument();
      expect(screen.queryByText(/PAINEL_SECRETO/)).not.toBeInTheDocument();
      expect(screen.queryByText(/CONFIG_SECRETO/)).not.toBeInTheDocument();

      // Dialog profissional visível com atalho de login
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/Área Restrita/i)).toBeInTheDocument();
      expect(screen.getByText(/credenciais da sua equipe/i)).toBeInTheDocument();
      expect(screen.getByText(/unidade\/área/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Entrar/i })).toBeInTheDocument();
    },
  );

  it("usuário autenticado navega normalmente pelo menu", () => {
    authState.user = { id: "u1" };
    authState.userRole = "user";
    renderDesktop();

    fireEvent.click(screen.getByRole("link", { name: /Dashboard/i }));
    expect(screen.getByText("DASHBOARD_SECRETO")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("MobileSidebar — guards de navegação", () => {
  beforeEach(() => {
    authState.user = null;
    authState.isLoading = false;
    authState.masterSession = null;
    authState.isMaster = false;
    authState.userRole = null;
  });

  it("visitante clica em 'Dashboard' e vê RestrictedAccessDialog sem navegar", () => {
    renderMobile();
    fireEvent.click(screen.getByRole("link", { name: /Dashboard/i }));
    expect(screen.queryByText(/DASHBOARD_SECRETO/)).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/credenciais da sua equipe/i)).toBeInTheDocument();
  });
});
