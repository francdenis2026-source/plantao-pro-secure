import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AuthSnapshot = {
  time: string;
  hasUser: boolean;
  userId?: string;
  email?: string;
  hasSession: boolean;
  expiresAt?: number | null;
  accessTokenPresent: boolean;
};

async function getSnapshot(): Promise<AuthSnapshot> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  return {
    time: new Date().toISOString(),
    hasUser: !!user,
    userId: user?.id,
    email: user?.email,
    hasSession: !!session,
    expiresAt: session?.expires_at ?? null,
    accessTokenPresent: !!session?.access_token,
  };
}

export default function DebugAuth() {
  const { user, session, isLoading } = useAuth();
  const [snapshots, setSnapshots] = useState<AuthSnapshot[]>([]);
  const [busy, setBusy] = useState(false);

  const current = useMemo<AuthSnapshot>(() => {
    return {
      time: new Date().toISOString(),
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      hasSession: !!session,
      expiresAt: (session as any)?.expires_at ?? null,
      accessTokenPresent: !!(session as any)?.access_token,
    };
  }, [user, session]);

  useEffect(() => {
    setSnapshots((prev) => [current, ...prev].slice(0, 20));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, (session as any)?.access_token]);

  const addSnapshot = async () => {
    const snap = await getSnapshot();
    setSnapshots((prev) => [snap, ...prev].slice(0, 50));
  };

  const handleRefreshSession = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      await addSnapshot();
      if (error) throw error;
      if (!data.session) throw new Error("refreshSession não retornou session");
    } finally {
      setBusy(false);
    }
  };

  const handleUnregisterSW = async () => {
    setBusy(true);
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await supabase.auth.signOut();
      await addSnapshot();
    } finally {
      setBusy(false);
    }
  };

  const statusBadge = (ok: boolean, label: string) => (
    <Badge variant={ok ? "default" : "destructive"}>{label}</Badge>
  );

  return (
    <main className="min-h-screen p-4 md:p-6 bg-background text-foreground">
      <div className="max-w-3xl mx-auto space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">Diagnóstico de Autenticação</h1>
          <p className="text-sm text-muted-foreground">
            Use esta tela para confirmar se a sessão está sendo criada, persistida e restaurada.
          </p>
        </header>

        <Card className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            {statusBadge(!isLoading, "Auth carregado")}
            {statusBadge(!!user, "user")}
            {statusBadge(!!session, "session")}
            {statusBadge(!!(session as any)?.access_token, "token")}
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>user.id: {user?.id ?? "—"}</div>
            <div>user.email: {user?.email ?? "—"}</div>
            <div>expires_at: {(session as any)?.expires_at ?? "—"}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy} onClick={addSnapshot}>
              Capturar snapshot
            </Button>
            <Button variant="outline" disabled={busy} onClick={handleRefreshSession}>
              Forçar refreshSession
            </Button>
            <Button variant="outline" disabled={busy} onClick={handleUnregisterSW}>
              Limpar cache + Service Worker
            </Button>
            <Button variant="destructive" disabled={busy} onClick={handleSignOut}>
              signOut
            </Button>
          </div>
        </Card>

        <section className="space-y-2">
          <h2 className="text-sm font-medium">Linha do tempo (mais recente primeiro)</h2>
          <div className="space-y-2">
            {snapshots.map((s, idx) => (
              <Card key={idx} className="p-3">
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <Badge variant="outline">{new Date(s.time).toLocaleString()}</Badge>
                  {statusBadge(s.hasUser, "user")}
                  {statusBadge(s.hasSession, "session")}
                  {statusBadge(s.accessTokenPresent, "token")}
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>userId: {s.userId ?? "—"}</div>
                  <div>email: {s.email ?? "—"}</div>
                  <div>expires_at: {s.expiresAt ?? "—"}</div>
                </div>
              </Card>
            ))}
            {snapshots.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem snapshots ainda.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
