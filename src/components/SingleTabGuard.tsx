import { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * SingleTabGuard
 * ---------------
 * Impede que o mesmo site seja aberto em várias abas do mesmo navegador.
 * A PRIMEIRA aba aberta permanece ativa. Abas subsequentes veem uma tela
 * bloqueadora informando que o app já está aberto em outra aba, sem executar
 * a lógica principal (não conta como novo usuário, não gera login, etc.).
 *
 * Estratégia:
 *  - Usa BroadcastChannel para negociar entre abas do mesmo browser.
 *  - Nova aba envia "ping"; abas existentes respondem "pong".
 *  - Se receber "pong" em <=500ms, esta aba é bloqueada.
 *  - Fallback via localStorage heartbeat (para browsers sem BroadcastChannel).
 */

const CHANNEL = "plantaopro-single-tab";
const HEARTBEAT_KEY = "plantaopro_tab_heartbeat";
const HEARTBEAT_INTERVAL = 1500;
const HEARTBEAT_STALE_MS = 4000;

type Msg =
  | { type: "ping"; id: string; ts: number }
  | { type: "pong"; id: string; ts: number }
  | { type: "focus-request"; id: string };

function newTabId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function SingleTabGuard({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const myId = newTabId();
    let bc: BroadcastChannel | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let decideTimeout: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const markBlocked = () => {
      if (disposed) return;
      setBlocked(true);
      setReady(true);
    };

    const markOwner = () => {
      if (disposed) return;
      setBlocked(false);
      setReady(true);
      // Escreve heartbeat inicial imediatamente.
      writeHeartbeat();
      heartbeatTimer = setInterval(writeHeartbeat, HEARTBEAT_INTERVAL);
    };

    const writeHeartbeat = () => {
      try {
        localStorage.setItem(
          HEARTBEAT_KEY,
          JSON.stringify({ id: myId, ts: Date.now() })
        );
      } catch {
        /* ignore */
      }
    };

    // 1) Verifica heartbeat existente (fallback / detecção rápida).
    let heartbeatOwner = false;
    try {
      const raw = localStorage.getItem(HEARTBEAT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { id: string; ts: number };
        if (parsed?.ts && Date.now() - parsed.ts < HEARTBEAT_STALE_MS) {
          heartbeatOwner = true;
        }
      }
    } catch {
      /* ignore */
    }

    // 2) BroadcastChannel para negociação em tempo real.
    if (typeof BroadcastChannel !== "undefined") {
      try {
        bc = new BroadcastChannel(CHANNEL);
      } catch {
        bc = null;
      }
    }

    if (bc) {
      bc.onmessage = (ev: MessageEvent<Msg>) => {
        const msg = ev.data;
        if (!msg || msg.id === myId) return;
        if (msg.type === "ping") {
          // Alguém está entrando — se somos os donos, respondemos "pong".
          if (!blocked && !disposed) {
            bc?.postMessage({ type: "pong", id: myId, ts: Date.now() } as Msg);
          }
        } else if (msg.type === "pong") {
          // Outra aba já é dona: nós somos o duplicado.
          markBlocked();
          if (decideTimeout) clearTimeout(decideTimeout);
        } else if (msg.type === "focus-request") {
          // Outra aba pediu foco (fluxo raro; principalmente para janela original).
          try {
            window.focus();
          } catch {
            /* ignore */
          }
        }
      };

      // Envia ping para detectar outros.
      bc.postMessage({ type: "ping", id: myId, ts: Date.now() } as Msg);
    }

    // 3) Decisão após breve janela de resposta.
    //    IMPORTANTE: só bloqueamos se outra aba responder AO VIVO ("pong")
    //    pelo BroadcastChannel. O heartbeat do localStorage é apenas dica —
    //    ele pode ficar "preso" quando a aba é fechada de forma abrupta
    //    (crash, mobile em background, kill do SO), gerando falsos positivos.
    void heartbeatOwner;
    decideTimeout = setTimeout(() => {
      if (disposed) return;
      markOwner();
    }, 500);

    // 4) Ao fechar a aba dona, limpa o heartbeat para liberar próxima aba.
    const cleanupHeartbeat = () => {
      try {
        const raw = localStorage.getItem(HEARTBEAT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { id: string };
          if (parsed?.id === myId) {
            localStorage.removeItem(HEARTBEAT_KEY);
          }
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("beforeunload", cleanupHeartbeat);
    window.addEventListener("pagehide", cleanupHeartbeat);

    return () => {
      disposed = true;
      if (decideTimeout) clearTimeout(decideTimeout);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      window.removeEventListener("beforeunload", cleanupHeartbeat);
      window.removeEventListener("pagehide", cleanupHeartbeat);
      cleanupHeartbeat();
      try {
        bc?.close();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    // Renderiza nada durante a negociação (~500ms) para não iniciar auth/queries
    // em uma aba que pode ser um duplicado.
    return null;
  }

  if (blocked) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/95 p-6 text-slate-100 backdrop-blur-xl">
        <div className="tactical-cards w-full max-w-md rounded-lg border border-amber-500/40 bg-slate-900/90 p-6 shadow-2xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full border border-amber-500/50 bg-amber-500/10 p-2">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
            </div>
            <h1 className="font-mono text-sm uppercase tracking-[0.22em] text-amber-400">
              Aba duplicada detectada
            </h1>
          </div>
          <p className="mb-2 text-sm leading-relaxed text-slate-300">
            O <b>Plantão Pro</b> já está aberto em outra aba deste navegador.
          </p>
          <p className="mb-5 text-xs leading-relaxed text-slate-400">
            Para evitar conflitos de sessão e contagens duplicadas, mantenha
            apenas uma aba ativa. Volte para a aba original ou feche-a antes de
            abrir uma nova.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1 border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
              onClick={() => {
                try {
                  const bc = new BroadcastChannel(CHANNEL);
                  bc.postMessage({ type: "focus-request", id: "duplicate" });
                  setTimeout(() => bc.close(), 200);
                } catch {
                  /* ignore */
                }
                window.close();
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Ir para a aba original
            </Button>
            <Button
              variant="ghost"
              className="flex-1 text-slate-400 hover:text-slate-200"
              onClick={() => {
                // Escape hatch: usuário força esta aba como dona.
                try {
                  localStorage.removeItem(HEARTBEAT_KEY);
                } catch {
                  /* ignore */
                }
                window.location.reload();
              }}
            >
              Usar esta aba mesmo assim
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
