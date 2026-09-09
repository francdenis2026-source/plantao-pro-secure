import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Play, Square, Users, Clock3, History, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';
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

function fmtClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

interface QuickRoundsModeProps {
  unitId: string | null;
  team: string | null;
}

/**
 * Modo rápido: o usuário digita os nomes na hora (sem precisar de agente
 * cadastrado), o sistema divide o turno proporcionalmente entre eles e
 * roda um cronômetro automático que avança sozinho de agente em agente.
 * Ao concluir: visitante reseta na hora; logado grava no histórico.
 */
export function QuickRoundsMode({ unitId, team }: QuickRoundsModeProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [names, setNames] = useState<string[]>(['', '']);
  const [startTime, setStartTime] = useState(() => nowHm());
  const [endTime, setEndTime] = useState(() => addHours(nowHm(), 12));
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [, forceTick] = useState(0);
  const savedRef = useRef(false);
  const durationMinutes = diffMinutes(startTime, endTime);

  const historyQuery = useQuery({
    queryKey: ['quick-round-history', unitId, team],
    queryFn: () => api.listQuickRoundHistory(unitId, team),
    enabled: !!user,
  });
  const history = historyQuery.data ?? [];

  const activeNames = useMemo(() => names.map((n) => n.trim()).filter(Boolean), [names]);
  const perAgentMs = startedAt ? (durationMinutes * 60_000) / activeNames.length : 0;
  const totalMs = durationMinutes * 60_000;

  useEffect(() => {
    if (!startedAt) return;
    const iv = window.setInterval(() => forceTick((t) => t + 1), 1000);
    return () => window.clearInterval(iv);
  }, [startedAt]);

  const now = Date.now();
  const elapsedMs = startedAt ? now - startedAt.getTime() : 0;
  const currentIndex = startedAt ? Math.min(Math.floor(elapsedMs / perAgentMs), activeNames.length - 1) : -1;
  const isDone = startedAt !== null && elapsedMs >= totalMs;

  useEffect(() => {
    if (!isDone || !startedAt || savedRef.current) return;
    savedRef.current = true;
    (async () => {
      if (user) {
        try {
          await api.saveQuickRoundHistory({
            unit_id: unitId, team, agent_names: activeNames,
            duration_minutes: durationMinutes, per_agent_minutes: durationMinutes / activeNames.length,
            started_at: startedAt.toISOString(), created_by: user.id,
          });
          queryClient.invalidateQueries({ queryKey: ['quick-round-history', unitId, team] });
          toast.success('Rodízio concluído — registrado no histórico.');
        } catch (e: any) {
          toast.error(e?.message ?? 'Rodízio concluído, mas não consegui salvar no histórico.');
        }
      } else {
        toast.success('Rodízio concluído. Pronto para o próximo plantão.');
      }
      setStartedAt(null);
      setNames(['', '']);
      savedRef.current = false;
    })();
  }, [isDone, startedAt, user, unitId, team, activeNames, durationMinutes, queryClient]);

  const addName = () => setNames((prev) => [...prev, '']);
  const removeName = (i: number) => setNames((prev) => prev.filter((_, idx) => idx !== i));
  const updateName = (i: number, value: string) => setNames((prev) => prev.map((n, idx) => (idx === i ? value : n)));

  const handleStart = () => {
    if (activeNames.length < 1) {
      toast.error('Digite pelo menos um nome.');
      return;
    }
    savedRef.current = false;
    setStartedAt(new Date());
  };

  const handleCancel = () => {
    savedRef.current = true;
    setStartedAt(null);
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

  // ---------- Rodando: cronômetro automático ----------
  if (startedAt) {
    const sliceStartMs = currentIndex * perAgentMs;
    const elapsedInSlice = elapsedMs - sliceStartMs;
    const remainingInSlice = perAgentMs - elapsedInSlice;
    const sliceProgressPct = Math.min(100, Math.max(0, (elapsedInSlice / perAgentMs) * 100));
    const overallProgressPct = Math.min(100, (elapsedMs / totalMs) * 100);

    const urgent = remainingInSlice < 60_000;

    return (
      <section className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 overflow-hidden rounded-2xl border border-primary/25 bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-primary/[0.06] px-5 py-3.5">
          <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Rodízio automático em andamento
          </h3>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleCancel}>
            <Square className="h-3.5 w-3.5" /> Cancelar
          </Button>
        </div>

        <div key={currentIndex} className="flex flex-col items-center gap-2 px-6 py-8 text-center animate-in fade-in-0 slide-in-from-bottom-3 zoom-in-95 duration-500">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Agente na ronda</p>
          <p className="text-2xl font-bold text-foreground">{activeNames[currentIndex]}</p>
          <p className={cn(
            'mt-1 font-mono text-4xl font-bold tabular-nums transition-colors',
            urgent ? 'text-destructive animate-pulse' : 'text-primary',
          )}>
            {fmtClock(remainingInSlice)}
          </p>
          <p className="text-xs text-muted-foreground">restante deste turno · {fmtClock(perAgentMs)} no total cada</p>
          <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full transition-all', urgent ? 'bg-destructive' : 'bg-primary')} style={{ width: `${sliceProgressPct}%` }} />
          </div>
        </div>

        <div className="border-t border-border px-5 py-4">
          <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Progresso geral do turno</span>
            <span className="tabular-nums">{fmtClock(elapsedMs)} / {fmtClock(totalMs)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary/70 transition-all" style={{ width: `${overallProgressPct}%` }} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
          {activeNames.map((name, i) => {
            const status = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'pending';
            return (
              <div
                key={`${name}-${i}`}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-500',
                  status === 'done' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
                  status === 'current' && 'border-primary/40 bg-primary/10 text-primary scale-105 shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]',
                  status === 'pending' && 'border-border bg-muted/30 text-muted-foreground',
                )}
              >
                {status === 'done' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className={cn('h-1.5 w-1.5 rounded-full bg-current', status === 'current' && 'animate-pulse')} />}
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
      <div className="flex items-center gap-3 border-b border-border bg-primary/[0.05] px-5 py-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
          <Users className="h-5 w-5 text-primary" strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Modo rápido — digitar nomes</h3>
          <p className="text-xs text-muted-foreground">Sem cadastro. O tempo é dividido igualmente e o cronômetro avança sozinho.</p>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Agentes</Label>
          {names.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={name}
                onChange={(e) => updateName(i, e.target.value)}
                placeholder={`Nome do agente ${i + 1}`}
                className="h-10"
              />
              {names.length > 1 && (
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground" onClick={() => removeName(i)}>
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
          <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5 text-primary" /> Início e fim da ronda
          </Label>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {fmtClock(durationMinutes * 60_000)} de ronda no total
            {activeNames.length > 0 && <> · <span className="font-medium text-primary">{fmtClock((durationMinutes * 60_000) / activeNames.length)}</span> por agente ({activeNames.length} agente{activeNames.length > 1 ? 's' : ''})</>}
          </p>
        </div>

        <Button size="lg" className="w-full gap-2" onClick={handleStart}>
          <Play className="h-4 w-4" /> Iniciar rodízio automático
        </Button>
      </div>

      {user && (
        <div className="border-t border-border px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground">
              <History className="h-3.5 w-3.5 text-primary" /> Histórico
            </h4>
            {history.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={handleClearHistory}>
                <Trash2 className="h-3 w-3" /> Limpar
              </Button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum rodízio registrado ainda.</p>
          ) : (
            <div className="space-y-1.5">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2 text-xs">
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
