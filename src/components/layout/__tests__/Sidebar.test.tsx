import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

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

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}{location.search}</div>;
}

function renderDesktop() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <>
              <Sidebar />
              <div>DASHBOARD_SECRETO</div>
            </>
          }
        />
        <Route path="/" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderMobile() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <>
              <MobileSidebar onNavigate={() => {}} />
              <div>DASHBOARD_SECRETO</div>
            </>
          }
        />
        <Route path="/" element={<LocationProbe />} />
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
    "visitante clica em '%s' e vai pra tela de identificação, sem ver o conteúdo protegido",
    (label) => {
      renderDesktop();
      const link = screen.getByRole("link", { name: new RegExp(label, "i") });
      fireEvent.click(link);

      // Não ficou no conteúdo protegido — foi redirecionado
      expect(screen.queryByText(/DASHBOARD_SECRETO/)).not.toBeInTheDocument();

      // Foi redirecionado pra home com o parâmetro que abre a identificação
      const probe = screen.getByTestId("location-probe");
      expect(probe.textContent).toContain("/?login=1");
      expect(probe.textContent).toContain(`feature=${encodeURIComponent(label)}`);
    },
  );

  it("visitante clica em 'Início' e navega normalmente (sem guard)", () => {
    renderDesktop();
    fireEvent.click(screen.getByRole("link", { name: /Início/i }));
    const probe = screen.getByTestId("location-probe");
    expect(probe.textContent).not.toContain("login=1");
  });

  it("usuário autenticado navega normalmente pelo menu", () => {
    authState.user = { id: "u1" };
    authState.userRole = "user";
    renderDesktop();

    // Sem guard, o link normal do react-router navega — aqui só garantimos
    // que nenhum redirect de login foi disparado.
    fireEvent.click(screen.getByRole("link", { name: /Banco de Horas/i }));
    const probe = screen.queryByTestId("location-probe");
    if (probe) expect(probe.textContent).not.toContain("login=1");
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

  it("visitante clica em 'Dashboard' e vai pra tela de identificação", () => {
    renderMobile();
    fireEvent.click(screen.getByRole("link", { name: /Dashboard/i }));
    expect(screen.queryByText(/DASHBOARD_SECRETO/)).not.toBeInTheDocument();
    const probe = screen.getByTestId("location-probe");
    expect(probe.textContent).toContain("/?login=1");
  });
});
