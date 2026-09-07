import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { adminClient } from '@/lib/adminClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { areNativeNotificationsAllowed } from '@/lib/reminderSettings';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Lock,
  Unlock,
  Trash2,
  Building2,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Bell,
  BellOff,
  BellRing,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const LAST_SEEN_KEY = 'audit_last_seen_at';
const NOTIF_ENABLED_KEY = 'audit_notif_enabled';

/** Beep tocado via Web Audio (sem asset) — 2 tons curtos estilo alerta tático. */
function playAlertBeep() {
  try {
    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [880, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    });
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    /* silencioso */
  }
}


interface RecentAgent {
  id: string;
  name: string;
  cpf: string;
  matricula: string | null;
  team: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  is_active: boolean | null;
  approval_status: string | null;
  license_status: string | null;
  unit: { id: string; name: string; municipality: string } | null;
}

interface Props {
  daysWindow?: number; // default 30
  onChange?: () => void;
}

const formatCPF = (cpf: string) =>
  cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

export function RecentRegistrationsAudit({ daysWindow = 30, onChange }: Props) {
  const [agents, setAgents] = useState<RecentAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<{
    open: boolean;
    kind: 'block' | 'unblock' | 'delete' | null;
    agent: RecentAgent | null;
  }>({ open: false, kind: null, agent: null });

  // Notificação sino/push
  const [lastSeen, setLastSeen] = useState<string>(() => {
    try {
      return localStorage.getItem(LAST_SEEN_KEY) || new Date().toISOString();
    } catch {
      return new Date().toISOString();
    }
  });
  const [notifEnabled, setNotifEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(NOTIF_ENABLED_KEY) !== '0';
    } catch {
      return true;
    }
  });
  const isFirstFetch = useRef(true);
  const knownIds = useRef<Set<string>>(new Set());

  const debouncedSearch = useDebouncedValue(search, 200);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysWindow);

      const { data, error } = await supabase
        .from('agents')
        .select(
          'id, name, cpf, matricula, team, phone, email, created_at, is_active, approval_status, license_status, unit:units(id, name, municipality)'
        )
        .gte('created_at', cutoff.toISOString())
        // Auditoria estrita: apenas cadastros já processados (approved/rejected).
        // Exclui 'pending' (fila de decisão vive na sub-aba "Pendentes") e
        // exclui NULL (cadastros sem status definido), garantindo zero
        // sobreposição entre as sub-abas de "Cadastros".
        .in('approval_status', ['approved', 'rejected'])

        .order('created_at', { ascending: false });

      if (error) throw error;

      const list = (data as unknown as RecentAgent[]) || [];

      // Detectar novos cadastros desde o último fetch (exceto no primeiro carregamento)
      if (!isFirstFetch.current && notifEnabled) {
        const brandNew = list.filter((a) => !knownIds.current.has(a.id));
        if (brandNew.length > 0) {
          playAlertBeep();
          const first = brandNew[0];
          const title = brandNew.length === 1
            ? `🆕 Novo cadastro: ${first.name}`
            : `🆕 ${brandNew.length} novos cadastros`;
          const body = brandNew.length === 1
            ? `${first.unit?.name || 'Unidade desconhecida'} · Equipe ${first.team || '—'}`
            : brandNew.slice(0, 3).map((a) => a.name).join(', ') + (brandNew.length > 3 ? '…' : '');

          toast(title, {
            description: body,
            icon: <BellRing className="w-5 h-5 text-cyan-400" />,
            duration: 8000,
          });

          // Push notification (se permissão concedida)
          if (areNativeNotificationsAllowed() && Notification.permission === 'granted') {
            try {
              new Notification(title, {
                body,
                tag: 'audit-new-agent',
                icon: '/favicon.ico',
              });
            } catch { /* ignore */ }
          }
        }
      }

      knownIds.current = new Set(list.map((a) => a.id));
      isFirstFetch.current = false;
      setAgents(list);
    } catch (err: any) {
      console.error('[RecentRegistrationsAudit] fetch error:', err);
      toast.error('Erro ao carregar cadastros recentes', {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysWindow, notifEnabled]);

  // Realtime — dispara imediatamente quando um novo agente é inserido
  useEffect(() => {
    const channel = supabase
      .channel('audit-new-agents')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agents' },
        () => {
          fetchAgents();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Solicita permissão de notificação uma vez ao ativar
  const requestNotifPermission = async () => {
    if (!areNativeNotificationsAllowed()) {
      toast.info('Modo "somente in-app" ativo — notificações do navegador estão desativadas nas configurações.');
      return;
    }
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'denied') {
      toast.error('Notificações bloqueadas', {
        description: 'Habilite nas configurações do navegador.',
      });
      return;
    }
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      toast.success('Notificações ativadas!', { icon: <BellRing className="w-5 h-5" /> });
    }
  };

  const toggleNotifications = async () => {
    const next = !notifEnabled;
    setNotifEnabled(next);
    try { localStorage.setItem(NOTIF_ENABLED_KEY, next ? '1' : '0'); } catch { /* */ }
    if (next) {
      await requestNotifPermission();
    } else {
      toast('Notificações silenciadas', { icon: <BellOff className="w-5 h-5" /> });
    }
  };

  const markAllSeen = () => {
    const now = new Date().toISOString();
    setLastSeen(now);
    try { localStorage.setItem(LAST_SEEN_KEY, now); } catch { /* */ }
    toast.success('Marcado como visto', { icon: <Check className="w-5 h-5" /> });
  };

  const unseenCount = useMemo(
    () => agents.filter((a) => new Date(a.created_at) > new Date(lastSeen)).length,
    [agents, lastSeen]
  );


  const filtered = useMemo(() => {
    const term = debouncedSearch.toLowerCase().trim();
    if (!term) return agents;
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(term) ||
        a.cpf.includes(debouncedSearch) ||
        (a.unit?.name || '').toLowerCase().includes(term) ||
        (a.matricula || '').toLowerCase().includes(term)
    );
  }, [agents, debouncedSearch]);

  const executeAction = async () => {
    if (!confirm.agent || !confirm.kind) return;
    const { agent, kind } = confirm;
    setProcessing(agent.id);
    try {
      if (kind === 'block') {
        await adminClient.toggleAgentStatus({ agentId: agent.id, isActive: false });
        toast.success(`${agent.name} bloqueado`, {
          icon: <Lock className="w-5 h-5 text-red-400" />,
        });
      } else if (kind === 'unblock') {
        await adminClient.toggleAgentStatus({ agentId: agent.id, isActive: true });
        toast.success(`${agent.name} desbloqueado`, {
          icon: <Unlock className="w-5 h-5 text-emerald-400" />,
        });
      } else if (kind === 'delete') {
        await adminClient.deleteAgent({ agentId: agent.id });
        toast.success(`${agent.name} excluído do sistema`, {
          icon: <Trash2 className="w-5 h-5 text-red-400" />,
        });
      }
      setConfirm({ open: false, kind: null, agent: null });
      fetchAgents();
      onChange?.();
    } catch (err: any) {
      console.error('[RecentRegistrationsAudit] action error:', err);
      toast.error('Erro ao executar operação', { description: err.message });
    } finally {
      setProcessing(null);
    }
  };

  const totalActive = agents.filter((a) => a.is_active).length;
  const totalBlocked = agents.filter((a) => !a.is_active).length;

  return (
    <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-cyan-500/30 shadow-xl shadow-cyan-500/5">
      <CardHeader className="border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-transparent">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
              <ShieldAlert className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-cyan-400">
                Auditoria de Novos Cadastros
              </CardTitle>
              <p className="text-sm text-slate-400 mt-0.5">
                Cadastros aprovados automaticamente nos últimos {daysWindow} dias — revise e tome ação
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {unseenCount > 0 && (
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 px-3 py-1 animate-pulse">
                <BellRing className="w-3.5 h-3.5 mr-1.5" />
                {unseenCount} novo{unseenCount !== 1 ? 's' : ''}
              </Badge>
            )}
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 px-3 py-1">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              {totalActive} ativo{totalActive !== 1 ? 's' : ''}
            </Badge>
            {totalBlocked > 0 && (
              <Badge className="bg-red-500/15 text-red-400 border-red-500/30 px-3 py-1">
                <Lock className="w-3.5 h-3.5 mr-1.5" />
                {totalBlocked} bloqueado{totalBlocked !== 1 ? 's' : ''}
              </Badge>
            )}
            {unseenCount > 0 && (
              <Button
                variant="outline"
                size="default"
                onClick={markAllSeen}
                className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 h-10"
                title="Marcar todos como vistos"
              >
                <Check className="w-4 h-4 mr-1.5" /> Marcar visto
              </Button>
            )}
            <Button
              variant="outline"
              size="default"
              onClick={toggleNotifications}
              className={cn(
                "h-10 border-slate-600 hover:bg-slate-700",
                notifEnabled && "border-cyan-500/40 text-cyan-300"
              )}
              title={notifEnabled ? 'Silenciar notificações' : 'Ativar notificações'}
            >
              {notifEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={fetchAgents}
              disabled={loading}
              className="border-slate-600 hover:bg-slate-700 h-10"
            >
              <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {/* Info banner */}
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-3">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200/90 leading-relaxed">
            <strong className="text-amber-400">Aprovação automática ativa.</strong> Novos agentes entram no sistema imediatamente após o cadastro.
            Use este painel para <strong>auditar</strong> — se identificar cadastro suspeito, clique em <strong>Bloquear</strong> (impede acesso mas mantém dados) ou <strong>Excluir</strong> (remove permanentemente).
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            placeholder="Buscar por nome, CPF, matrícula ou unidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-12 text-base bg-slate-800/50 border-slate-700"
            autoComplete="new-password"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-20 h-20 mx-auto rounded-full bg-slate-800 flex items-center justify-center">
              <Users className="w-10 h-10 text-slate-500" />
            </div>
            <p className="text-slate-400 text-base">
              {search ? 'Nenhum resultado encontrado' : `Nenhum cadastro nos últimos ${daysWindow} dias`}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {filtered.map((agent) => {
              const isBlocked = agent.is_active === false;
              return (
                <div
                  key={agent.id}
                  className={cn(
                    'p-4 rounded-xl border transition-all duration-300',
                    'bg-gradient-to-r from-slate-800/80 to-slate-800/40',
                    isBlocked
                      ? 'border-red-500/30 hover:border-red-500/50'
                      : 'border-cyan-500/20 hover:border-cyan-500/40',
                    'hover:shadow-lg'
                  )}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-[240px] space-y-2.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div className={cn(
                          "p-2 rounded-lg",
                          isBlocked ? "bg-red-500/15" : "bg-slate-700/50"
                        )}>
                          <Users className={cn("w-5 h-5", isBlocked ? "text-red-400" : "text-cyan-400")} />
                        </div>
                        <span className="font-bold text-white text-base">
                          {agent.name}
                        </span>
                        {isBlocked ? (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            BLOQUEADO
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            ATIVO
                          </Badge>
                        )}
                        <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30 text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDistanceToNow(new Date(agent.created_at), { locale: ptBR, addSuffix: true })}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-slate-300">
                        <div>CPF: <span className="font-mono">{formatCPF(agent.cpf)}</span></div>
                        {agent.matricula && <div>Matrícula: {agent.matricula}</div>}
                        {agent.unit && (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-slate-500" />
                            <span>{agent.unit.name}</span>
                          </div>
                        )}
                        {agent.team && <div>Equipe: {agent.team}</div>}
                        {agent.phone && <div>Tel: {agent.phone}</div>}
                        <div className="flex items-center gap-1.5 text-slate-400 col-span-full">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          {format(new Date(agent.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      {isBlocked ? (
                        <Button
                          size="sm"
                          onClick={() => setConfirm({ open: true, kind: 'unblock', agent })}
                          disabled={processing === agent.id}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white h-10 px-4"
                        >
                          <Unlock className="w-4 h-4 mr-2" />
                          Desbloquear
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirm({ open: true, kind: 'block', agent })}
                          disabled={processing === agent.id}
                          className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 h-10 px-4"
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Bloquear
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirm({ open: true, kind: 'delete', agent })}
                        disabled={processing === agent.id}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-10 px-4"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirm.open}
        onOpenChange={(o) => !o && setConfirm({ open: false, kind: null, agent: null })}
      >
        <DialogContent
          className={cn(
            'max-w-md p-6 bg-slate-900',
            confirm.kind === 'delete' ? 'border-red-500/30' : 'border-amber-500/30'
          )}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'p-4 rounded-xl border',
                  confirm.kind === 'delete'
                    ? 'bg-red-500/20 border-red-500/30'
                    : confirm.kind === 'unblock'
                      ? 'bg-emerald-500/20 border-emerald-500/30'
                      : 'bg-amber-500/20 border-amber-500/30'
                )}
              >
                {confirm.kind === 'delete' ? (
                  <Trash2 className="w-8 h-8 text-red-400" />
                ) : confirm.kind === 'unblock' ? (
                  <Unlock className="w-8 h-8 text-emerald-400" />
                ) : (
                  <Lock className="w-8 h-8 text-amber-400" />
                )}
              </div>
              <div>
                <h3
                  className={cn(
                    'font-bold text-xl',
                    confirm.kind === 'delete'
                      ? 'text-red-400'
                      : confirm.kind === 'unblock'
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                  )}
                >
                  {confirm.kind === 'delete'
                    ? 'Excluir Cadastro'
                    : confirm.kind === 'unblock'
                      ? 'Desbloquear Agente'
                      : 'Bloquear Agente'}
                </h3>
                <p className="text-base text-slate-400">{confirm.agent?.name}</p>
              </div>
            </div>

            <div
              className={cn(
                'p-4 rounded-lg border text-sm',
                confirm.kind === 'delete'
                  ? 'bg-red-500/10 border-red-500/20 text-red-200'
                  : confirm.kind === 'unblock'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
              )}
            >
              <AlertTriangle className="w-5 h-5 inline mr-2" />
              {confirm.kind === 'delete'
                ? 'Esta ação é PERMANENTE. Todos os dados do agente (plantões, BH, mensagens) serão removidos e ele não conseguirá mais acessar o sistema.'
                : confirm.kind === 'unblock'
                  ? 'O agente voltará a ter acesso completo ao sistema imediatamente.'
                  : 'O agente perderá o acesso ao sistema. Os dados serão mantidos e você pode desbloquear a qualquer momento.'}
            </div>
          </div>

          <DialogFooter className="mt-5 gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirm({ open: false, kind: null, agent: null })}
              className="border-slate-600 h-11"
            >
              Cancelar
            </Button>
            <Button
              onClick={executeAction}
              disabled={processing === confirm.agent?.id}
              className={cn(
                'h-11',
                confirm.kind === 'delete'
                  ? 'bg-red-600 hover:bg-red-500'
                  : confirm.kind === 'unblock'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-amber-600 hover:bg-amber-500'
              )}
            >
              {confirm.kind === 'delete' ? (
                <>
                  <Trash2 className="w-5 h-5 mr-2" />
                  Confirmar Exclusão
                </>
              ) : confirm.kind === 'unblock' ? (
                <>
                  <Unlock className="w-5 h-5 mr-2" />
                  Confirmar Desbloqueio
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Confirmar Bloqueio
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
