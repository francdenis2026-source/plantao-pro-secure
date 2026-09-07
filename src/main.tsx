import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/panel-hud.css";
// Homepage typography — Space Grotesk (headings) + DM Sans (body)
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import { pushConsoleError, pushDiagEvent } from "@/lib/diagLog";

// Capture console errors for the Diagnostics report (no sensitive values).
(function installConsoleCapture() {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    try {
      pushConsoleError(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    } catch {
      // ignore
    }
    originalError(...args);
  };
})();

// Cleanup legado: a função "Programar ronda" foi removida definitivamente.
// Purga qualquer chave residual de armed-rounds no boot para garantir que
// nenhum estado antigo do localStorage interfira com o botão Iniciar.
(function purgeArmedRoundsLegacy() {
  try {
    (['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'] as const).forEach((team) => {
      localStorage.removeItem(`plantaopro_armed_${team}`);
    });
    // Varredura defensiva para variantes desconhecidas do prefixo.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('plantaopro_armed_')) localStorage.removeItem(k);
    }
  } catch { /* ignore */ }
})();

function isSafeModeActive(): boolean {
  try {
    const enabled = localStorage.getItem('plantaopro_safe_mode') === 'true';
    const expiry = localStorage.getItem('plantaopro_safe_mode_expiry');
    if (!enabled) return false;
    if (!expiry) return true;
    return Date.now() < parseInt(expiry, 10);
  } catch {
    return false;
  }
}

// Guard: never register the app-shell SW in dev, Lovable preview, iframes,
// or when the user asks to disable it via ?sw=off. Stale SWs are the #1
// cause of "PWA travando" (frozen UI, white screen, reload loops).
function shouldSkipServiceWorker(): boolean {
  try {
    if (!import.meta.env.PROD) return true;
    if (window.self !== window.top) return true;
    const host = window.location.hostname;
    if (
      host.startsWith("id-preview--") ||
      host.startsWith("preview--") ||
      host === "lovableproject.com" ||
      host.endsWith(".lovableproject.com") ||
      host === "lovableproject-dev.com" ||
      host.endsWith(".lovableproject-dev.com") ||
      host === "beta.lovable.dev" ||
      host.endsWith(".beta.lovable.dev")
    ) {
      return true;
    }
    if (new URLSearchParams(window.location.search).has("sw") &&
        new URLSearchParams(window.location.search).get("sw") === "off") {
      return true;
    }
  } catch {
    return true;
  }
  return false;
}

async function unregisterAllServiceWorkers() {
  try {
    if (!("serviceWorker" in navigator)) return;
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("plantao-pro-"))
          .map((n) => caches.delete(n).catch(() => false))
      );
    }
  } catch {
    // ignore
  }
}

if ("serviceWorker" in navigator && shouldSkipServiceWorker()) {
  // Preview / dev / kill-switch: ensure no stale SW keeps serving old HTML.
  void unregisterAllServiceWorkers();
  pushDiagEvent('warn', 'sw_skipped_preview_or_dev');
} else if ("serviceWorker" in navigator && !isSafeModeActive()) {

  const w = window as unknown as { __pp_sw_registered?: boolean };
  if (!w.__pp_sw_registered) {
    w.__pp_sw_registered = true;

    // Snapshot controller BEFORE registration. If there is no controller at
    // boot, this page was loaded without a SW — the imminent activate + claim
    // is the very first install, NOT an update, so we must not reload.
    const hadControllerAtBoot = !!navigator.serviceWorker.controller;

    // Guarded one-time reload when a new SW takes control. Uses sessionStorage
    // so a refresh storm cannot loop: we only reload once per tab session.
    const RELOAD_FLAG = "pp_sw_reloaded_once";
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "SW_ACTIVATED") {
        if (!hadControllerAtBoot) {
          pushDiagEvent('info', 'sw_activated_first_install_no_reload');
          return;
        }
        try {
          if (sessionStorage.getItem(RELOAD_FLAG)) return;
          sessionStorage.setItem(RELOAD_FLAG, "1");
        } catch {
          return;
        }
        pushDiagEvent('info', 'sw_activated_reload');
        try {
          sessionStorage.setItem('pp_sw_updated_banner', event.data?.version || '1');
        } catch { /* ignore */ }
        window.location.reload();
      }
    });

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(async (registration) => {
        pushDiagEvent('info', 'sw_registered', {
          scope: registration.scope,
          hasWaiting: !!registration.waiting,
        });

        try {
          await registration.update();
        } catch {
          // ignore
        }

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            pushDiagEvent('info', 'sw_state', { state: newWorker.state });
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        // Auto-update: poll for a new SW every 60s and whenever the tab
        // regains focus / comes back online. Ensures installed PWAs pick up
        // new builds without a manual refresh.
        const triggerUpdate = () => {
          registration.update().catch(() => {});
        };
        setInterval(triggerUpdate, 60_000);
        window.addEventListener("focus", triggerUpdate);
        window.addEventListener("online", triggerUpdate);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") triggerUpdate();
        });

        console.log("Service Worker registered successfully");
      })
      .catch((error) => {
        pushDiagEvent('error', 'sw_register_failed', { message: String(error) });
        console.error("Service Worker registration failed:", error);
      });
  }
} else if ("serviceWorker" in navigator) {
  pushDiagEvent('warn', 'safe_mode_sw_skipped');
}

createRoot(document.getElementById("root")!).render(<App />);

// Hide the native Capacitor splash screen once React has mounted.
// No-op on the web (import resolves but call fails silently outside native).
(async () => {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { SplashScreen } = await import("@capacitor/splash-screen");
    // Give the first paint a beat so the transition is smooth.
    setTimeout(() => {
      SplashScreen.hide({ fadeOutDuration: 400 }).catch(() => {});
    }, 600);
  } catch {
    // ignore — plugin not installed on web builds
  }
})();
