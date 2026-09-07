import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TAB_KEY = "plantaopro_tab_id";

function getTabId(): string {
  let id = sessionStorage.getItem(TAB_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(TAB_KEY, id);
  }
  return id;
}

export function SingleDeviceGuard() {
  const { user, signOut } = useAuth();
  const [kicked, setKicked] = useState(false);
  const [countdown, setCountdown] = useState(2);
  const myTabRef = useRef<string>("");
  const myTsRef = useRef<number>(0);

  useEffect(() => {
    if (!user?.id) {
      setKicked(false);
      return;
    }

    const myTab = getTabId();
    const myTs = Date.now();
    myTabRef.current = myTab;
    myTsRef.current = myTs;

    // Política: o acesso MAIS RECENTE prevalece. Ao entrar, este dispositivo
    // envia um "claim" avisando todas as sessões antigas para se encerrarem.
    // Quem receber um claim mais novo (>2s) que o próprio ts, sai automaticamente.
    // Curta janela de graça (4s) protege contra reconexões do Realtime derrubarem
    // o próprio dispositivo que acabou de entrar.
    const GRACE_MS = 4_000;
    const MIN_GAP_MS = 2_000;
    const graceUntil = myTs + GRACE_MS;

    const channel = supabase.channel(`single-device:${user.id}`, {
      config: { broadcast: { self: false } },
    });

    const handleClaim = (msg: any) => {
      const { tabId, ts } = msg.payload ?? {};
      if (!tabId || tabId === myTabRef.current) return;
      if (Date.now() < graceUntil) return;
      if (typeof ts === "number" && ts > myTsRef.current + MIN_GAP_MS) {
        setKicked(true);
      }
    };

    channel
      .on("broadcast", { event: "hello" }, handleClaim)
      .on("broadcast", { event: "claim" }, handleClaim)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // "claim" = eu sou o dispositivo mais recente, os antigos devem sair.
          channel.send({
            type: "broadcast",
            event: "claim",
            payload: {
              tabId: myTab,
              ts: myTs,
              deviceLabel: navigator.userAgent.slice(0, 60),
            },
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const performLogout = async () => {
    try {
      await signOut();
    } catch {
      /* noop */
    } finally {
      setKicked(false);
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.replace("/");
      }
    }
  };

  useEffect(() => {
    if (!kicked) return;
    setCountdown(2);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          performLogout();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kicked]);

  if (!kicked) return null;

  return (
    <AlertDialog open={kicked}>
      <AlertDialogContent className="max-w-md border-amber-500/40 bg-slate-950/95 backdrop-blur">
        <AlertDialogHeader className="items-center text-center">
          <div className="mb-2 flex h-24 w-24 items-center justify-center">
            <svg viewBox="0 0 120 120" className="h-24 w-24 drop-shadow-[0_0_18px_rgba(245,158,11,0.55)]">
              <defs>
                <linearGradient id="sdg-shield" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
                <radialGradient id="sdg-pulse" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="60" cy="60" r="55" fill="url(#sdg-pulse)">
                <animate attributeName="r" values="45;58;45" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
              </circle>
              <path
                d="M60 15 L98 30 V60 C98 82 82 100 60 108 C38 100 22 82 22 60 V30 Z"
                fill="url(#sdg-shield)"
                stroke="#fef3c7"
                strokeWidth="1.5"
              />
              <path
                d="M45 58 V50 a15 15 0 0 1 30 0 v8"
                fill="none"
                stroke="#0f172a"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <rect x="42" y="58" width="36" height="26" rx="4" fill="#0f172a" />
              <circle cx="60" cy="70" r="3.5" fill="#fbbf24" />
              <rect x="58.5" y="70" width="3" height="8" fill="#fbbf24" />
            </svg>
          </div>
          <AlertDialogTitle className="font-serif text-xl tracking-wide text-amber-400">
            SESSÃO ENCERRADA
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-center text-slate-300">
            <span className="block text-sm">
              Detectamos um novo acesso à sua conta em <strong className="text-amber-300">outro dispositivo</strong>.
            </span>
            <span className="block text-xs text-slate-400">
              Por segurança operacional, apenas um dispositivo pode permanecer ativo por vez.
            </span>
            <span className="mt-3 block rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-mono text-xs text-amber-200">
              Encerrando esta sessão em {countdown}s…
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={performLogout}
            className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400"
          >
            Sair agora
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
