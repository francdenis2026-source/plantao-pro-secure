import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Radio, RefreshCw, Loader2, CheckCircle2, PlayCircle, ChevronLeft, ChevronRight,
  Clock, Users, Shield, Info, Timer, ListChecks, Zap,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/data-states';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RoundLog {
  id: string;
  action: 'create' | 'update' | string;
  created_at: string;
  details: Record<string, any> | null;
  agent_name: string | null;
}

interface Props {
  agentId: string;
}

const PAGE_SIZE_DESKTOP = 10;
const PAGE_SIZE_MOBILE = 5;



const fmtDateTime = (iso?: string | null) =>
  iso ? format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—';

const fmtDuration = (totalSeconds?: number | null) => {
  if (!totalSeconds || totalSeconds <= 0) return '—';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
};

const eventMeta = (log: RoundLog) => {
  const ev = log.details?.event as string | undefined;
  if (ev === 'rounds_started' || log.action === 'create') {
    return {
      label: 'Ronda iniciada',
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      Icon: PlayCircle,
    };
  }
  if (ev === 'rounds_completed' || log.action === 'update') {
    return {
      label: 'Ronda concluída',
      color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      Icon: CheckCircle2,
    };
  }
  return {
    label: 'Registro de ronda',
    color: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    Icon: Radio,
  };
};

export function RoundsHistoryCard({ agentId }: Props) {
  const isMobile = useIsMobile();
  const PAGE_SIZE = useMemo(() => (isMobile ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP), [isMobile]);
  const [logs, setLogs] = useState<RoundLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RoundLog | null>(null);


  const fetchLogs = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from('activity_logs')
        .select('id, action, created_at, details, agent_name', { count: 'estimated' })
        .eq('agent_id', agentId)
        .eq('resource_type', 'rounds')
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      setLogs((data as any) || []);
      setTotal(count || 0);
    } catch (err) {
      console.error('[RoundsHistoryCard] fetch failed', err);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [agentId, page, PAGE_SIZE]);

  useEffect(() => { void fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Card className="tactical-card">
        <CardHeader className="pb-2 pt-2 px-2 md:pb-3 md:px-6 md:pt-6">
          <div className="flex items-center justify-between gap-2 md:gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
                <Radio className="h-4 w-4 md:h-5 md:w-5 text-amber-400 shrink-0" />
                <span className="truncate">Histórico de Rondas</span>
              </CardTitle>
              <CardDescription className="text-[10px] md:text-xs">
                Sessões iniciadas e concluídas por você no Gestor de Rondas.
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => void fetchLogs()} disabled={loading} className="h-7 w-7 md:h-9 md:w-9 shrink-0">
              <RefreshCw className={`h-3.5 w-3.5 md:h-4 md:w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-2 md:space-y-3 px-2 pb-2 md:px-6 md:pb-6">

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={Radio}
              title="Nenhuma ronda registrada"
              description="Abra o Gestor de Rondas acima, monte a escala e inicie o cronômetro. Cada sessão iniciada aparecerá aqui em tempo real."
              action={
                <button
                  type="button"
                  onClick={() => {
                    const trigger = document.querySelector<HTMLElement>('[data-rounds-manager-trigger], button[aria-label*="Gestor de Rondas" i]');
                    if (trigger) {
                      trigger.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      trigger.focus({ preventScroll: true });
                    } else {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-amber-300 transition-all hover:bg-amber-500/20 hover:border-amber-400/70 focus-ring-primary"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Iniciar primeira ronda
                </button>
              }
            />
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const meta = eventMeta(log);
                const d = log.details || {};
                const team = d.team as string | undefined;
                const mode = d.mode as string | undefined;
                const agents = d.agents_count as number | undefined;
                return (
                  <button
                    key={log.id}
                    onClick={() => setSelected(log)}
                    className="w-full text-left flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors"
                  >
                    <div className="p-1.5 md:p-2 rounded-full bg-amber-500/10 shrink-0">
                      <meta.Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Metadata row: horizontal scroll on small screens, no wrap */}
                      <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 whitespace-nowrap md:whitespace-normal md:flex-wrap">
                        <Badge className={`text-[9px] md:text-[10px] px-1.5 py-0 border shrink-0 ${meta.color}`}>
                          {meta.label}
                        </Badge>
                        {team && (
                          <span className="text-[11px] md:text-xs font-semibold text-amber-200 shrink-0">
                            EQUIPE {team}
                          </span>
                        )}
                        {mode && (
                          <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                            {mode === 'split' ? 'Divisão auto.' : `Intervalo ${d.interval_min || '?'}min`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 mt-1 text-[11px] md:text-xs text-muted-foreground overflow-hidden">
                        <span className="inline-flex items-center gap-1 truncate">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="truncate">{fmtDateTime(log.created_at)}</span>
                        </span>
                        {typeof agents === 'number' && (
                          <span className="inline-flex items-center gap-1 shrink-0">
                            <Users className="h-3 w-3" />
                            {agents}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </button>
                );
              })}

            </div>
          )}

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
              <span className="text-[10px] md:text-xs text-muted-foreground truncate">
                Pág. {page + 1}/{totalPages} · {total} regs
              </span>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || loading}
                  className="h-7 w-7 md:h-9 md:w-9 p-0"
                >
                  <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1 || loading}
                  className="h-7 w-7 md:h-9 md:w-9 p-0"
                >
                  <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      <RoundDetailsDialog log={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </>
  );
}

function RoundDetailsDialog({
  log, onOpenChange,
}: { log: RoundLog | null; onOpenChange: (open: boolean) => void }) {
  const open = !!log;
  const d = log?.details || {};
  const meta = log ? eventMeta(log) : null;

  const team = d.team as string | undefined;
  const mode = d.mode as string | undefined;
  const startTime = d.start_time as string | undefined;
  const endTime = d.end_time as string | undefined;
  const intervalMin = d.interval_min as number | undefined;
  const agentsCount = d.agents_count as number | undefined;
  const agents = Array.isArray(d.agents) ? (d.agents as string[]) : [];
  const startedAt = d.started_at as string | undefined;
  const completedAt = d.completed_at as string | undefined;
  const totalSeconds = d.total_seconds as number | undefined;
  const nightLocked = d.night_locked as boolean | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-amber-500/30 text-slate-100">
        {log && meta && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <meta.Icon className="h-5 w-5 text-amber-400" />
                Detalhes da Ronda
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Registro salvo em {fmtDateTime(log.created_at)}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[65vh] pr-3">
              <div className="space-y-4">
                {/* Status header */}
                <div className={`p-3 rounded-lg border ${meta.color} flex items-center gap-3`}>
                  <meta.Icon className="h-5 w-5" />
                  <div className="flex-1">
                    <div className="font-bold text-sm">{meta.label}</div>
                    <div className="text-[11px] opacity-80">
                      Ação: {log.action} · Agente: {log.agent_name || '—'}
                    </div>
                  </div>
                </div>

                {/* Grid de dados */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <DataField Icon={Shield} label="Equipe" value={team ? `EQUIPE ${team}` : '—'} />
                  <DataField
                    Icon={ListChecks}
                    label="Modo"
                    value={mode === 'split' ? 'Divisão automática' : mode ? `Intervalo ${intervalMin || '?'} min` : '—'}
                  />
                  <DataField
                    Icon={Clock}
                    label="Janela operacional"
                    value={startTime && endTime ? `${startTime} → ${endTime}` : '—'}
                  />
                  <DataField Icon={Users} label="Agentes" value={agentsCount ? `${agentsCount} agentes` : '—'} />
                  <DataField Icon={PlayCircle} label="Início" value={fmtDateTime(startedAt || log.created_at)} />
                  <DataField
                    Icon={CheckCircle2}
                    label="Conclusão"
                    value={completedAt ? fmtDateTime(completedAt) : 'Em andamento / não concluída'}
                  />
                  {typeof totalSeconds === 'number' && (
                    <DataField Icon={Timer} label="Duração total" value={fmtDuration(totalSeconds)} />
                  )}
                  {typeof nightLocked === 'boolean' && (
                    <DataField
                      Icon={Info}
                      label="Bloqueio noturno"
                      value={nightLocked ? 'Ativo (22:00→06:00)' : 'Desativado'}
                    />
                  )}
                </div>

                {/* Lista de agentes */}
                {agents.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-wider text-amber-300/80 font-bold">
                      Agentes escalados ({agents.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {agents.map((name, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md bg-slate-800/60 border border-slate-700"
                        >
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className="truncate">{name || `Agente ${i + 1}`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interpretação profissional */}
                <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700 text-xs text-slate-300 space-y-1">
                  <div className="font-bold text-slate-200 flex items-center gap-1">
                    <Info className="h-3.5 w-3.5 text-amber-400" /> Como interpretar
                  </div>
                  <p>
                    <b>Ronda iniciada</b> registra o momento em que a sessão foi ativada no Gestor de Rondas,
                    incluindo equipe, janela operacional e agentes envolvidos.
                  </p>
                  <p>
                    <b>Ronda concluída</b> é gravada automaticamente ao final do ciclo, incluindo a duração
                    total efetiva desde o início até a conclusão.
                  </p>
                </div>

                {/* Debug/raw fallback for extra fields */}
                <details className="text-[10px] text-muted-foreground">
                  <summary className="cursor-pointer hover:text-amber-300">
                    Ver metadados brutos
                  </summary>
                  <pre className="mt-2 p-2 rounded bg-slate-950 border border-slate-800 overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </details>
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DataField({
  Icon, label, value,
}: { Icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-md bg-slate-800/50 border border-slate-700/60">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-sm font-semibold text-slate-100 mt-0.5 break-words">{value}</div>
    </div>
  );
}

export default RoundsHistoryCard;
