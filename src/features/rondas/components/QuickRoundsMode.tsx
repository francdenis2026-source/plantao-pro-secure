import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Play, Square, Users, Clock3, History, Trash2, CheckCircle2, ArrowRight, CalendarClock, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '../api';

/** Início/fim em "HH:mm" → duração em minutos. Vira o dia (fim < início) soma 24h. */
function diffMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

function nowHm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function addHours(hm: string, hours: number): string {
  const [h, m] = hm.split(':').map(Number);
  const total = (h * 60 + m + hours * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Próxima ocorrência de "HH:mm" a partir de agora (hoje, ou amanhã se já passou). */
function nextOccurrence(hm: string): Date {
  const [h, m] = hm.split(':').map(Number);
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(h, m);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

function fmtClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const CHIP_COLORS = ['#2F6FED', '#D62839', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16'];

interface QuickRoundsModeProps {
  unitId: string | null;
  team: string | null;
}

interface Session {
  names: string[];
  startTime: string;
  endTime: string;
  durationMinutes: number;
  triggerAt: string; // ISO — quando o cronômetro efetivamente começa a contar
  phase: 'waiting' | 'running';
}

/**
 * Modo rápido: nomes digitados na hora, tempo dividido proporcionalmente,
 * cronômetro automático. Uma vez ativado (agora ou programado para um
 * horário), o estado é salvo no localStorage — sobrevive a refresh e só
 * libera a tela de configuração quando a programação termina ou é cancelada.
 */
export function QuickRoundsMode({ unitId, team }: QuickRoundsModeProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const storageKey = `quick-rounds-session-${unitId ?? 'x'}-${team ?? 'x'}`;

  const [names, setNames] = useState<string[]>(['', '']);
  const [startTime, setStartTime] = useState(() => nowHm());
  const [endTime, setEndTime] = useState(() => addHours(nowHm(), 12));
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  });
  const [, forceTick] = useState(0);
  const savedRef = useRef(false);

  const durationMinutes = diffMinutes(startTime, endTime);
  const activeNames = useMemo(() => names.map((n) => n.trim()).filter(Boolean), [names]);

  const historyQuery = useQuery({
    queryKey: ['quick-round-history', unitId, team],
    queryFn: () => api.listQuickRoundHistory(unitId, team),
    enabled: !!user,
  });
  const history = historyQuery.data ?? [];

  const persist = (s: Session | null) => {
    setSession(s);
    try {
      if (s) localStorage.setItem(storageKey, JSON.stringify(s));
      else localStorage.removeItem(storageKey);
    } catch { /* ignore */ }
  };

  // Cronômetro: 1 tick/s sempre que há sessão ativa (esperando ou rodando).
  useEffect(() => {
    if (!session) return;
    const iv = window.setInterval(() => forceTick((t) => t + 1), 1000);
    return () => window.clearInterval(iv);
  }, [session]);

  const now = Date.now();
  const triggerMs = session ? new Date(session.triggerAt).getTime() : 0;
  const isWaiting = session?.phase === 'waiting' && now < triggerMs;

  // Programado: assim que a hora chega, vira "running" sozinho.
  useEffect(() => {
    if (session?.phase === 'waiting' && now >= triggerMs) {
      persist({ ...session, phase: 'running' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  const sessionNames = session ? session.names : [];
  const perAgentMs = session ? (session.durationMinutes * 60_000) / sessionNames.length : 0;
  const totalMs = session ? session.durationMinutes * 60_000 : 0;
  const elapsedMs = session && session.phase === 'running' ? Math.max(0, now - triggerMs) : 0;
  const currentIndex = session && session.phase === 'running' ? Math.min(Math.floor(elapsedMs / perAgentMs), sessionNames.length - 1) : -1;
  const isDone = session?.phase === 'running' && elapsedMs >= totalMs;

  useEffect(() => {
    if (!isDone || !session || savedRef.current) return;
    savedRef.current = true;
    (async () => {
      if (user) {
        try {
          await api.saveQuickRoundHistory({
            unit_id: unitId, team, agent_names: sessionNames,
            duration_minutes: session.durationMinutes, per_agent_minutes: session.durationMinutes / sessionNames.length,
            started_at: session.triggerAt, created_by: user.id,
          });
          queryClient.invalidateQueries({ queryKey: ['quick-round-history', unitId, team] });
          toast.success('Rodízio concluído — registrado no histórico.');
        } catch (e: any) {
          toast.error(e?.message ?? 'Rodízio concluído, mas não consegui salvar no histórico.');
        }
      } else {
        toast.success('Rodízio concluído. Pronto para o próximo plantão.');
      }
      persist(null);
      setNames(['', '']);
      savedRef.current = false;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone]);

  const addName = () => setNames((prev) => [...prev, '']);
  const removeName = (i: number) => setNames((prev) => prev.filter((_, idx) => idx !== i));
  const updateName = (i: number, value: string) => setNames((prev) => prev.map((n, idx) => (idx === i ? value : n)));

  const startSession = (mode: 'now' | 'scheduled') => {
    if (activeNames.length < 1) {
      toast.error('Digite pelo menos um nome.');
      return;
    }
    savedRef.current = false;
    const triggerAt = mode === 'now' ? new Date() : nextOccurrence(startTime);
    persist({
      names: activeNames, startTime, endTime, durationMinutes,
      triggerAt: triggerAt.toISOString(), phase: mode === 'now' ? 'running' : 'waiting',
    });
    toast.success(mode === 'now' ? 'Rodízio iniciado.' : `Programado para iniciar às ${startTime}.`);
  };

  const handleCancel = () => {
    savedRef.current = true;
    persist(null);
    toast.info('Rodízio cancelado — nada foi salvo.');
  };

  const handleClearHistory = async () => {
    try {
      await api.clearQuickRoundHistory(unitId, team);
      queryClient.invalidateQueries({ queryKey: ['quick-round-history', unitId, team] });
      toast.success('Histórico limpo.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Não foi possível limpar o histórico.');
    }
  };

  // ---------- Aguardando horário programado ----------
  if (session && isWaiting) {
    return (
      <section className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 overflow-hidden rounded-2xl border border-primary/25 bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-primary/[0.06] px-4 py-3">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground">
            <CalendarClock className="h-3.5 w-3.5 text-primary" /> Programado — aguardando horário
          </h3>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" onClick={handleCancel}>
            <Square className="h-3 w-3" /> Cancelar
          </Button>
        </div>
        <div className="flex flex-col items-center gap-1.5 px-6 py-7 text-center">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Inicia às {session.startTime}, com {sessionNames.length} agente{sessionNames.length > 1 ? 's' : ''}</p>
          <p className="font-mono text-3xl font-bold tabular-nums text-primary">{fmtClock(triggerMs - now)}</p>
          <p className="text-xs text-muted-foreground">{sessionNames.join(' · ')}</p>
        </div>
      </section>
    );
  }

  // ---------- Rodando: cronômetro automático ----------
  if (session && session.phase === 'running') {
    const sliceStartMs = currentIndex * perAgentMs;
    const elapsedInSlice = elapsedMs - sliceStartMs;
    const remainingInSlice = perAgentMs - elapsedInSlice;
    const sliceProgressPct = Math.min(100, Math.max(0, (elapsedInSlice / perAgentMs) * 100));
    const overallProgressPct = Math.min(100, (elapsedMs / totalMs) * 100);
    const urgent = remainingInSlice < 60_000;

    return (
      <section className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 overflow-hidden rounded-2xl border border-primary/25 bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-primary/[0.06] px-4 py-3">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Rodízio em andamento
          </h3>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" onClick={handleCancel}>
            <Square className="h-3 w-3" /> Cancelar
          </Button>
        </div>

        <div key={currentIndex} className="flex flex-col items-center gap-1.5 px-6 py-6 text-center animate-in fade-in-0 slide-in-from-bottom-3 zoom-in-95 duration-500">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Agente na ronda</p>
          <p className="text-xl font-bold text-foreground">{sessionNames[currentIndex]}</p>
          <p className={cn('font-mono text-3xl font-bold tabular-nums transition-colors', urgent ? 'text-destructive animate-pulse' : 'text-primary')}>
            {fmtClock(remainingInSlice)}
          </p>
          <div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full transition-all', urgent ? 'bg-destructive' : 'bg-primary')} style={{ width: `${sliceProgressPct}%` }} />
          </div>
        </div>

        <div className="border-t border-border px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Progresso geral</span>
            <span className="tabular-nums">{fmtClock(elapsedMs)} / {fmtClock(totalMs)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary/70 transition-all" style={{ width: `${overallProgressPct}%` }} />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 border-t border-border px-4 py-3">
          {sessionNames.map((name, i) => {
            const status = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'pending';
            return (
              <div
                key={`${name}-${i}`}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-500',
                  status === 'done' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
                  status === 'current' && 'border-primary/40 bg-primary/10 text-primary scale-105 shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]',
                  status === 'pending' && 'border-border bg-muted/30 text-muted-foreground',
                )}
              >
                {status === 'done' ? <CheckCircle2 className="h-3 w-3" /> : <span className={cn('h-1.5 w-1.5 rounded-full bg-current', status === 'current' && 'animate-pulse')} />}
                {name}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // ---------- Configuração ----------
  return (
    <section className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2.5 border-b border-border bg-primary/[0.05] px-4 py-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
          <Users className="h-4 w-4 text-primary" strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Modo rápido — digitar nomes</h3>
          <p className="text-[11px] text-muted-foreground">Sem cadastro. Tempo dividido igualmente, cronômetro automático.</p>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3.5">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Agentes</Label>
          {names.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHIP_COLORS[i % CHIP_COLORS.length] }} />
              <Input value={name} onChange={(e) => updateName(i, e.target.value)} placeholder={`Nome do agente ${i + 1}`} className="h-9" />
              {names.length > 1 && (
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground" onClick={() => removeName(i)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={addName}>
            <Plus className="h-3.5 w-3.5" /> Adicionar agente
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5 text-primary" /> Início e fim da ronda
          </Label>
          <div className="flex items-center gap-2">
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
        </div>

        {/* Barra visual proporcional — mostra o pedaço de cada agente */}
        {activeNames.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full">
              {activeNames.map((n, i) => (
                <div key={i} style={{ width: `${100 / activeNames.length}%`, background: CHIP_COLORS[i % CHIP_COLORS.length] }} className="h-full first:rounded-l-full last:rounded-r-full" />
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {fmtClock(durationMinutes * 60_000)} no total · <span className="font-medium text-primary">{fmtClock((durationMinutes * 60_000) / activeNames.length)}</span> por agente ({activeNames.length})
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button variant="outline" className="gap-1.5" onClick={() => startSession('scheduled')}>
            <CalendarClock className="h-4 w-4" /> Programar p/ {startTime}
          </Button>
          <Button className="gap-1.5" onClick={() => startSession('now')}>
            <Zap className="h-4 w-4" /> Iniciar agora
          </Button>
        </div>
      </div>

      {user && (
        <div className="border-t border-border px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground">
              <History className="h-3.5 w-3.5 text-primary" /> Histórico
            </h4>
            {history.length > 0 && (
              <Button variant="ghost" size="sm" className="h-6 gap-1 text-[11px] text-muted-foreground" onClick={handleClearHistory}>
                <Trash2 className="h-3 w-3" /> Limpar
              </Button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Nenhum rodízio registrado ainda.</p>
          ) : (
            <div className="space-y-1.5">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-2.5 py-1.5 text-[11px]">
                  <span className="text-foreground">{h.agent_names.join(', ')}</span>
                  <span className="shrink-0 text-muted-foreground">{new Date(h.completed_at).toLocaleString('pt-BR', { timeZone: 'America/Rio_Branco' })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
