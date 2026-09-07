import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, ShieldAlert, LogIn, LogOut, Ban, Edit3, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type TeamKey = 'ALFA' | 'BRAVO' | 'CHARLIE' | 'DELTA';

type AuditItem = {
  id: string;
  ts: string;
  kind: 'login' | 'logout' | 'blocked' | 'change' | 'failed';
  actor: string;
  team: TeamKey | null;
  detail: string;
};

const KIND_META: Record<AuditItem['kind'], { label: string; color: string; Icon: typeof LogIn }> = {
  login: { label: 'Login', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', Icon: LogIn },
  logout: { label: 'Logout', color: 'bg-slate-500/15 text-slate-300 border-slate-500/30', Icon: LogOut },
  failed: { label: 'Falha de autenticação', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30', Icon: ShieldAlert },
  blocked: { label: 'Bloqueio', color: 'bg-red-500/15 text-red-300 border-red-500/30', Icon: Ban },
  change: { label: 'Alteração', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30', Icon: Edit3 },
};

export function SecurityAuditCard() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState<'ALL' | TeamKey>('ALL');
  const [kindFilter, setKindFilter] = useState<'ALL' | AuditItem['kind']>('ALL');

  const load = async () => {
    setIsLoading(true);
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const iso = startOfDay.toISOString();

      const [{ data: logs }, { data: attempts }, { data: agents }] = await Promise.all([
        supabase
          .from('activity_logs')
          .select('id, agent_id, agent_name, action, resource_type, details, created_at')
          .gte('created_at', iso)
          .in('action', ['login', 'logout', 'update', 'delete', 'approve', 'reject', 'activate', 'deactivate'])
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('login_attempts')
          .select('id, identifier, attempt_time, success, ip_address')
          .gte('attempt_time', iso)
          .eq('success', false)
          .order('attempt_time', { ascending: false })
          .limit(100),
        supabase.from('agents').select('id, name, cpf, team'),
      ]);

      const byId = new Map<string, { name: string; team: TeamKey | null }>();
      const byCpf = new Map<string, { name: string; team: TeamKey | null }>();
      (agents || []).forEach((a: any) => {
        const t = (a.team as string | null)?.toUpperCase() as TeamKey | undefined;
        const rec = { name: a.name, team: (t && ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'].includes(t) ? t : null) as TeamKey | null };
        if (a.id) byId.set(a.id, rec);
        if (a.cpf) byCpf.set(a.cpf, rec);
      });

      const fromLogs: AuditItem[] = (logs || []).map((l: any) => {
        const info = l.agent_id ? byId.get(l.agent_id) : undefined;
        const isLogin = l.action === 'login';
        const isLogout = l.action === 'logout';
        const kind: AuditItem['kind'] = isLogin ? 'login' : isLogout ? 'logout' : 'change';
        const detail =
          isLogin || isLogout
            ? format(new Date(l.created_at), "HH:mm:ss", { locale: ptBR })
            : `${l.action.toUpperCase()} · ${l.resource_type}`;
        return {
          id: `log-${l.id}`,
          ts: l.created_at,
          kind,
          actor: info?.name || l.agent_name || 'Sistema',
          team: info?.team ?? null,
          detail,
        };
      });

      const fromAttempts: AuditItem[] = (attempts || []).map((a: any) => {
        const cpf = String(a.identifier || '').split('@')[0];
        const info = byCpf.get(cpf);
        return {
          id: `att-${a.id}`,
          ts: a.attempt_time,
          kind: 'failed' as const,
          actor: info?.name || cpf || 'Desconhecido',
          team: info?.team ?? null,
          detail: `IP ${a.ip_address || 'n/d'}`,
        };
      });

      const merged = [...fromLogs, ...fromAttempts].sort(
        (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime(),
      );
      setItems(merged);
    } catch (err) {
      console.error('[audit] load failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (teamFilter !== 'ALL' && it.team !== teamFilter) return false;
      if (kindFilter !== 'ALL' && it.kind !== kindFilter) return false;
      return true;
    });
  }, [items, teamFilter, kindFilter]);

  const counts = useMemo(() => {
    const c = { login: 0, logout: 0, failed: 0, change: 0, blocked: 0 };
    items.forEach((it) => {
      c[it.kind] = (c[it.kind] || 0) + 1;
    });
    return c;
  }, [items]);

  return (
    <Card className="glass glass-border shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Modo Auditoria — Eventos de Segurança do Dia
            </CardTitle>
            <CardDescription className="text-xs">
              Logins, bloqueios e alterações registrados desde 00:00
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v as any)}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as equipes</SelectItem>
                <SelectItem value="ALFA">ALFA</SelectItem>
                <SelectItem value="BRAVO">BRAVO</SelectItem>
                <SelectItem value="CHARLIE">CHARLIE</SelectItem>
                <SelectItem value="DELTA">DELTA</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as any)}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os eventos</SelectItem>
                <SelectItem value="login">Logins</SelectItem>
                <SelectItem value="logout">Logouts</SelectItem>
                <SelectItem value="failed">Falhas de auth</SelectItem>
                <SelectItem value="change">Alterações</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={load} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-300">
            {counts.login} logins
          </Badge>
          <Badge variant="outline" className="text-[10px] border-slate-500/30 text-slate-300">
            {counts.logout} logouts
          </Badge>
          <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-300">
            {counts.failed} falhas
          </Badge>
          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">
            {counts.change} alterações
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum evento correspondente para os filtros selecionados.
          </p>
        ) : (
          <ScrollArea className="h-[320px] pr-3">
            <div className="space-y-1.5">
              {filtered.map((it) => {
                const meta = KIND_META[it.kind];
                const Icon = meta.Icon;
                return (
                  <div
                    key={it.id}
                    className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/20 px-2.5 py-1.5"
                  >
                    <div className={`p-1.5 rounded ${meta.color} border`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium truncate">{it.actor}</span>
                        {it.team && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/30 text-primary">
                            {it.team}
                          </Badge>
                        )}
                        <Badge className={`text-[9px] px-1 py-0 border ${meta.color}`}>{meta.label}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{it.detail}</p>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      {format(new Date(it.ts), 'HH:mm:ss')}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
