import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { StrictMode } from "react";
import { SplashScreen } from "@/components/SplashScreen";

vi.mock("@/lib/diagLog", () => ({
  pushDiagEvent: vi.fn(),
}));

describe("SplashScreen", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    // Reset module-level guard between tests
    vi.resetModules();
  });

  it("renders on first mount within a tab", async () => {
    const { SplashScreen: Fresh } = await import("@/components/SplashScreen");
    render(<Fresh />);
    expect(screen.getByRole("dialog", { name: /Inicializando/i })).toBeInTheDocument();
    expect(sessionStorage.getItem("plantaopro_splash_shown")).toBe("1");
  });

  it("does not render again after being shown in the same tab", async () => {
    sessionStorage.setItem("plantaopro_splash_shown", "1");
    const { SplashScreen: Fresh } = await import("@/components/SplashScreen");
    const { container } = render(<Fresh />);
    expect(container.firstChild).toBeNull();
  });

  it("only renders once under StrictMode double-invoke", async () => {
    const { SplashScreen: Fresh } = await import("@/components/SplashScreen");
    render(
      <StrictMode>
        <Fresh />
      </StrictMode>,
    );
    expect(screen.getAllByRole("dialog", { name: /Inicializando/i })).toHaveLength(1);
  });

  it("does not re-render if parent remounts within the same runtime", async () => {
    const { SplashScreen: Fresh } = await import("@/components/SplashScreen");
    const first = render(<Fresh />);
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    first.unmount();

    const second = render(<Fresh />);
    expect(second.container.firstChild).toBeNull();
  });
});
