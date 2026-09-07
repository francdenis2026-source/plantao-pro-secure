import React, { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { pushDiagEvent } from "@/lib/diagLog";
import { RestrictedArea } from "./RestrictedArea";

interface RequireAuthProps {
  children: React.ReactNode;
  /** 'redirect' envia visitantes ao login; 'block' mostra RestrictedArea. */
  mode?: "redirect" | "block";
  redirectTo?: string;
  /** Exige papel master (usuário master ou sessão master ativa). */
  requireMaster?: boolean;
}

/**
 * Loader branded — usa o mesmo `bg-background` das rotas para evitar qualquer
 * "flash preto" durante a transição login → painel. Só aparece após ~250ms,
 * então transições realmente instantâneas continuam sem UI extra.
 */
const AuthLoader: React.FC<{ debugTag?: string }> = ({ debugTag }) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 250);
    return () => window.clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-auth-loader={debugTag ?? "1"}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-background text-amber-100/85"
    >
      <div className="relative h-12 w-12">
        <span className="absolute inset-0 rounded-full border-2 border-amber-400/25" />
        <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400 animate-spin" />
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-[11px] font-mono uppercase tracking-[0.35em] text-amber-300/80">
          Autenticando
        </span>
        <span className="text-xs text-amber-100/60">
          Validando sessão segura…
        </span>
      </div>
    </div>
  );
};

/**
 * Janela de graça adaptativa:
 *  - Se `getSession()` confirmou sessão em cache: espera até `user` hidratar
 *    (limite de segurança GRACE_MAX_MS).
 *  - Se `getSession()` confirmou ausência de sessão: redireciona imediatamente
 *    (zero espera para visitantes reais).
 *  - Enquanto `getSession()` não retornou: espera GRACE_INITIAL_MS.
 * Cobre a corrida entre `signInWithPassword` (popula sessão sincronicamente
 * no cliente supabase) e o `onAuthStateChange` que atualiza o React.
 */
const GRACE_INITIAL_MS = 400;
const GRACE_MAX_MS = 2500;

/**
 * Sampling de eventos `info` em produção. Em dev/preview registramos tudo.
 * Em produção só ~10% das transições "não-interessantes" são gravadas —
 * transições que envolvem hidratação/corrida sempre passam (ver `interesting`).
 */
const IS_PROD = import.meta.env.PROD;
const SAMPLE_INFO = !IS_PROD || Math.random() < 0.1;

function logInfo(name: string, data: Record<string, unknown>) {
  if (!SAMPLE_INFO) return;
  pushDiagEvent("info", name, data);
}

export const RequireAuth: React.FC<RequireAuthProps> = ({
  children,
  mode = "redirect",
  redirectTo = "/",
  requireMaster = false,
}) => {
  const { user, isLoading, masterSession, isMaster, userRole } = useAuth();
  const location = useLocation();

  // Undecided | true | false — snapshot da sessão em cache do supabase-js.
  const [cachedSession, setCachedSession] = useState<boolean | null>(null);
  // Limite máximo (safety net) para nunca travar a UI indefinidamente.
  const [maxGraceElapsed, setMaxGraceElapsed] = useState(false);
  const mountedRef = useRef(true);
  const startRef = useRef<number>(Date.now());
  const lastDiagRef = useRef<string>("");

  useEffect(() => {
    mountedRef.current = true;
    startRef.current = Date.now();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Consulta síncrona à sessão em cache + timer de segurança.
  useEffect(() => {
    let cancelled = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled || !mountedRef.current) return;
        const has = !!data.session;
        setCachedSession(has);
        logInfo("require_auth_getsession", {
          route: location.pathname,
          mode,
          cachedSession: has,
          elapsedMs: Date.now() - startRef.current,
        });
      })
      .catch((err) => {
        if (cancelled || !mountedRef.current) return;
        setCachedSession(false);
        // Always keep warnings — cheap and useful.
        pushDiagEvent("warn", "require_auth_getsession_failed", {
          route: location.pathname,
          message: String((err as any)?.message ?? err),
        });
      });

    const t = window.setTimeout(() => {
      if (mountedRef.current) setMaxGraceElapsed(true);
    }, GRACE_MAX_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [location.pathname, mode]);

  // Log condicional (uma linha por transição de estado). Em produção só
  // registramos transições "interessantes" — corridas de hidratação (cachedSession
  // true sem user), roleHydrating, ou isLoading — para não inundar sessionStorage.
  const roleHydratingNow = !!user && userRole === null && !masterSession;
  const stateKey = `${location.pathname}|il=${isLoading}|u=${!!user}|ms=${!!masterSession}|rh=${roleHydratingNow}|cs=${cachedSession}|mg=${maxGraceElapsed}`;
  const interesting =
    isLoading ||
    roleHydratingNow ||
    (cachedSession === true && !user && !masterSession) ||
    (cachedSession === null && Date.now() - startRef.current < GRACE_INITIAL_MS);
  if (lastDiagRef.current !== stateKey && (SAMPLE_INFO || interesting)) {
    lastDiagRef.current = stateKey;
    logInfo("require_auth_state", {
      route: location.pathname,
      mode,
      isLoading,
      hasUser: !!user,
      hasMaster: !!masterSession,
      userRole: userRole ?? null,
      cachedSession,
      maxGraceElapsed,
      elapsedMs: Date.now() - startRef.current,
    });
  }

  // Espera hidratação de papel (RLS).
  const roleHydrating = !!user && userRole === null && !masterSession;
  if (isLoading || roleHydrating) {
    return <AuthLoader debugTag="loading-or-role" />;
  }

  const isAuthenticated = !!user || !!masterSession;

  if (!isAuthenticated) {
    // 1. Sabemos que há sessão em cache → só falta React hidratar. Aguarda
    //    até GRACE_MAX_MS. Vale para redirect E block (evita RestrictedArea
    //    piscar em /dashboard e /master logo após um login válido).
    if (cachedSession === true && !maxGraceElapsed) {
      return <AuthLoader debugTag="waiting-hydration" />;
    }

    // 2. Ainda não sabemos se há sessão (getSession pendente) e ainda estamos
    //    dentro da janela inicial curta — aguarda para evitar bounce em
    //    conexões lentas onde `signInWithPassword` acabou de resolver.
    const elapsed = Date.now() - startRef.current;
    if (cachedSession === null && elapsed < GRACE_INITIAL_MS) {
      return <AuthLoader debugTag="waiting-getsession" />;
    }

    // 3. Sem sessão real → decidir pelo modo.
    pushDiagEvent("warn", "require_auth_unauthenticated", {
      route: location.pathname,
      mode,
      cachedSession,
      elapsedMs: elapsed,
      redirectTo: mode === "redirect" ? redirectTo : null,
    });

    if (mode === "block") return <RestrictedArea />;
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ from: location.pathname, authRequired: true }}
      />
    );
  }

  if (requireMaster && !isMaster && !masterSession) {
    return (
      <RestrictedArea
        title="Acesso Master Exclusivo"
        message="Este módulo é restrito ao Administrador Master do sistema."
      />
    );
  }

  return <>{children}</>;
};

export default RequireAuth;
