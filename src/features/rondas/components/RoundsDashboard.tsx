import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WifiOff, Clock3, Sun, Moon, Users, Building2, MapPin, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import * as api from '../api';
import { useRoundTimer } from '../useRoundTimer';
import { RoundTimer } from './RoundTimer';
import { RoundControls } from './RoundControls';
import { RoundMetrics } from './RoundMetrics';
import { RoundTimeline } from './RoundTimeline';
import { NextRounds } from './NextRounds';
import { RoundAgentList } from './RoundAgentList';
import { IncidentDialog } from './IncidentDialog';
import { ShiftDivider } from './ShiftDivider';
import { RoundHistory } from './RoundHistory';
import { enqueuePatrolAction, flushPatrolQueue, getQueueLength } from '../offlineQueue';
import type { PatrolSlot } from '../types';

/**
 * Central operacional de rondas. Hierarquia visual (Seção 20/53):
 * ronda atual > timer > próximas > timeline > agentes > ocorrências > KPIs.
 */
export function RoundsDashboard() {
  const { agent } = useAgentProfile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [dividerOpen, setDividerOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [pendingCount, setPendingCount] = useState(() => getQueueLength());

  // Allow manual team/unit selection for unauthenticated users
  const [guestTeam, setGuestTeam] = useState<string | null>(null);
  const [guestUnitId, setGuestUnitId] = useState<string | null>(null);

  const flushQueue = async () => {
    const { synced, remaining } = await flushPatrolQueue({
      start: api.startSlot, pause: api.pauseSlot, resume: api.resumeSlot, complete: api.completeSlot,
      extend: (slotId, minutes) => api.extendSlot(slotId, minutes),
    });
    setPendingCount(remaining);
    if (synced > 0) {
      toast.success(`${synced} ação${synced > 1 ? 'ões' : ''} sincronizada${synced > 1 ? 's' : ''}.`);
      queryClient.invalidateQueries({ queryKey: ['patrol-slots'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-metrics'] });
    }
  };

  useEffect(() => {
    const on = () => { setIsOnline(true); void flushQueue(); };
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    void flushQueue();
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unitId = agent?.unit_id ?? guestUnitId ?? null;
  const team = agent?.team ?? guestTeam ?? null;

  const shiftQuery = useQuery({
    queryKey: ['patrol-shift', unitId, team],
    queryFn: () => api.getActiveShift(unitId!, team!),
    enabled: !!unitId && !!team,
    refetchInterval: 30_000,
  });
  const shift = shiftQuery.data ?? null;

  const slotsQuery = useQuery({
    queryKey: ['patrol-slots', shift?.id],
    queryFn: () => api.listShiftSlots(shift!.id),
    enabled: !!shift?.id,
    refetchInterval: 15_000,
  });
  const slots = slotsQuery.data ?? [];

  const agentsQuery = useQuery({
    queryKey: ['patrol-agents', shift?.id],
    queryFn: () => api.listShiftAgents(shift!.id),
    enabled: !!shift?.id,
  });
  const shiftAgents = agentsQuery.data ?? [];

  const sectorsQuery = useQuery({
    queryKey: ['patrol-sectors', unitId],
    queryFn: () => api.listSectors(unitId!),
    enabled: !!unitId,
  });
  const sectors = sectorsQuery.data ?? [];

  const metricsQuery = useQuery({
    queryKey: ['patrol-metrics', shift?.id],
    queryFn: () => api.getMetrics(shift!.id),
    enabled: !!shift?.id,
    refetchInterval: 20_000,
  });
  const metrics = metricsQuery.data ?? { total_slots: 0, completed_slots: 0, pending_slots: 0, late_slots: 0, open_incidents: 0, coverage_pct: 0 };

  // Realtime: reflete ações de outros agentes/supervisores imediatamente.
  useEffect(() => {
    if (!shift?.id) return;
    const channel = supabase
      .channel(`patrol-slots-${shift.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patrol_slots', filter: `shift_id=eq.${shift.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['patrol-slots', shift.id] });
        queryClient.invalidateQueries({ queryKey: ['patrol-metrics', shift.id] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patrol_incidents', filter: `unit_id=eq.${unitId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['patrol-metrics', shift.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [shift?.id, unitId, queryClient]);

  // Marca slots atrasados periodicamente (não é cron de banco, é polling leve do cliente).
  useEffect(() => {
    if (!shift?.id) return;
    const iv = window.setInterval(() => {
      api.markLateSlots(shift.id).then(() => queryClient.invalidateQueries({ queryKey: ['patrol-slots', shift.id] })).catch(() => {});
    }, 30_000);
    return () => window.clearInterval(iv);
  }, [shift?.id, queryClient]);

  const currentAgentSlot = useMemo(
    () => slots.find((s) => s.agent_id === agent?.id && (s.status === 'active' || s.status === 'late' || s.status === 'incident')) ?? null,
    [slots, agent?.id],
  );
  const timer = useRoundTimer(currentAgentSlot);

  const invalidateAll = () => {
    if (!shift?.id) return;
    queryClient.invalidateQueries({ queryKey: ['patrol-slots', shift.id] });
    queryClient.invalidateQueries({ queryKey: ['patrol-metrics', shift.id] });
  };

  const handleStart = async (slot: PatrolSlot) => {
    try { await api.startSlot(slot.id); invalidateAll(); }
    catch (e: any) { toast.error(e?.message ?? 'Não foi possível iniciar a ronda.'); }
  };
  /** Se a rede falhar, a ação entra na fila offline em vez de ser perdida
   * (Seção 39) — nunca finge sucesso: o toast deixa claro que ficou pendente. */
  const runOrQueue = async (
    action: Parameters<typeof enqueuePatrolAction>[0],
    fn: () => Promise<unknown>,
    pendingMsg: string,
  ) => {
    try {
      await fn();
      invalidateAll();
    } catch (e: any) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        enqueuePatrolAction(action);
        setPendingCount(getQueueLength());
        toast.warning(pendingMsg + ' Sem conexão — será enviado quando a rede voltar.');
      } else {
        toast.error(e?.message ?? 'Ação não concluída.');
      }
    }
  };

  const handlePause = async () => {
    if (!currentAgentSlot) return;
    await runOrQueue({ type: 'pause', slotId: currentAgentSlot.id }, () => api.pauseSlot(currentAgentSlot.id), 'Pausa registrada localmente.');
  };
  const handleResume = async () => {
    if (!currentAgentSlot) return;
    await runOrQueue({ type: 'resume', slotId: currentAgentSlot.id }, () => api.resumeSlot(currentAgentSlot.id), 'Retomada registrada localmente.');
  };
  const handleComplete = async () => {
    if (!currentAgentSlot) return;
    await runOrQueue({ type: 'complete', slotId: currentAgentSlot.id }, async () => {
      await api.completeSlot(currentAgentSlot.id);
      toast.success('Ronda finalizada.');
    }, 'Finalização registrada localmente.');
  };
  const handleExtend = async () => {
    if (!currentAgentSlot) return;
    await runOrQueue({ type: 'extend', slotId: currentAgentSlot.id, minutes: 5 }, () => api.extendSlot(currentAgentSlot.id, 5), 'Extensão registrada localmente.');
  };
  const handleIncident = async (input: { type: string; severity: any; description: string }) => {
    if (!unitId) return;
    await api.createIncident({ slot_id: currentAgentSlot?.id ?? null, unit_id: unitId, agent_id: agent?.id ?? null, ...input });
    invalidateAll();
    toast.success('Ocorrência registrada.');
  };

  if (!unitId || !team) {
    // Allow guest users to select team and unit manually
    if (!user) {
      return (
        <div className="space-y-4 p-6">
          <h2 className="text-lg font-bold">Gestor de Rondas - Acesso Público</h2>
          <p className="text-sm text-muted-foreground">Selecione uma equipe e unidade para visualizar as rondas</p>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Equipe</label>
              <select
                value={guestTeam || ''}
                onChange={(e) => setGuestTeam(e.target.value || null)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm mt-1"
              >
                <option value="">Selecione uma equipe...</option>
                <option value="ALFA">ALFA</option>
                <option value="BRAVO">BRAVO</option>
                <option value="CHARLIE">CHARLIE</option>
                <option value="DELTA">DELTA</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Unidade</label>
              <input
                type="text"
                value={guestUnitId || ''}
                onChange={(e) => setGuestUnitId(e.target.value || null)}
                placeholder="Digite o ID ou nome da unidade"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm mt-1"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3">Ou faça login para usar seu perfil de agente</p>
          </div>
        </div>
      );
    }
    return <p className="p-6 text-sm text-muted-foreground">Vincule seu perfil a uma unidade e equipe para usar o Gestor de Rondas.</p>;
  }

  if (shiftQuery.isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
        <p className="text-sm text-muted-foreground">Nenhum turno de rondas ativo para a equipe {team}.</p>
        {user && (
          <>
            <Button onClick={() => setDividerOpen(true)}>Criar turno de rondas</Button>
            <NewShiftDialog open={dividerOpen} onOpenChange={setDividerOpen} unitId={unitId} team={team} createdBy={user?.id ?? ''} onCreated={() => shiftQuery.refetch()} />
          </>
        )}
        {!user && (
          <p className="text-xs text-muted-foreground mt-2">Faça login para criar novos turnos de rondas</p>
        )}
      </div>
    );
  }

  const shiftStart = new Date(shift.start_at);
  const shiftEnd = new Date(shift.end_at);
  const fmtHm = (d: Date) =>
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Rio_Branco' });
  const isNightShift = shiftStart.getHours() >= 18 || shiftStart.getHours() < 6;

  return (
    <div className="space-y-4 p-4">
      {!isOnline && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          <WifiOff className="h-4 w-4" /> Sem conexão — as ações serão reenviadas quando a rede voltar.
        </div>
      )}
      {isOnline && pendingCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          <Clock3 className="h-4 w-4" /> {pendingCount} alteração(ões) pendente(s) de sincronização...
        </div>
      )}

      {/* Cabeçalho operacional — título + contexto do turno */}
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">Gestor de Rondas</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Controle, acompanhamento e segurança em tempo real
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          {[
            {
              Icon: isNightShift ? Moon : Sun,
              label: 'Turno',
              value: `${isNightShift ? 'Noturno' : 'Diurno'} (${fmtHm(shiftStart)} – ${fmtHm(shiftEnd)})`,
            },
            { Icon: Users, label: 'Equipe', value: team },
            { Icon: Building2, label: 'Unidade', value: agent?.unit?.name ?? 'Minha unidade' },
          ].map(({ Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2"
            >
              <Icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
              <div className="min-w-0 leading-tight">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="truncate text-[13px] font-semibold text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </header>

      <RoundMetrics metrics={metrics} />

      {/* Bloco principal: ronda atual (destaque) + fila de próximas rondas */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.55fr_1fr]">
        {currentAgentSlot && timer ? (
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Ronda em andamento
              </h3>
              <span className="truncate rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                {currentAgentSlot.sector?.name ?? 'Setor não definido'}
              </span>
            </div>

            <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-center lg:gap-6">
              <RoundTimer timer={timer} />

              <div className="flex w-full min-w-0 flex-col gap-4">
                <dl className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
                    <div className="min-w-0">
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Ronda atual</dt>
                      <dd className="truncate text-[15px] font-bold text-foreground">
                        {currentAgentSlot.sector?.name ?? 'Setor não definido'}
                      </dd>
                      <dd className="text-xs tabular-nums text-muted-foreground">
                        {fmtHm(new Date(currentAgentSlot.scheduled_start))} – {fmtHm(new Date(currentAgentSlot.scheduled_end))}
                      </dd>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
                    <div className="min-w-0">
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Agente responsável</dt>
                      <dd className="truncate text-[15px] font-bold text-foreground">
                        {currentAgentSlot.agent?.name ?? agent?.name ?? '—'}
                      </dd>
                      <dd className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {timer.isPaused ? 'Pausado' : 'Em ronda'}
                      </dd>
                    </div>
                  </div>
                </dl>

                <RoundControls
                  slot={currentAgentSlot}
                  isPaused={timer.isPaused}
                  onPause={handlePause}
                  onResume={handleResume}
                  onComplete={handleComplete}
                  onExtend={handleExtend}
                  onIncident={() => setIncidentOpen(true)}
                  canExtend
                />
              </div>
            </div>
          </section>
        ) : (
          <section className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
            <Clock3 className="h-8 w-8 text-muted-foreground" strokeWidth={1.8} />
            <p className="mt-2 text-sm text-muted-foreground">Você não está em ronda no momento.</p>
            {slots.some((s) => s.agent_id === agent?.id && s.status === 'pending') && (
              <Button
                className="mt-3"
                onClick={() => {
                  const next = slots.find((s) => s.agent_id === agent?.id && s.status === 'pending');
                  if (next) handleStart(next);
                }}
              >
                Iniciar próxima ronda
              </Button>
            )}
          </section>
        )}

        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-foreground">Próximas rondas</h3>
          <NextRounds slots={slots} />
        </section>
      </div>

      {/* Linha do tempo do turno */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-foreground">
            Linha do tempo — quartos de hora
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            {[
              { c: 'bg-emerald-500', l: 'Concluída' },
              { c: 'bg-sky-500', l: 'Em andamento' },
              { c: 'bg-muted-foreground/50', l: 'Pendente' },
              { c: 'bg-amber-500', l: 'Atraso' },
              { c: 'bg-rose-500', l: 'Ocorrência' },
            ].map((k) => (
              <span key={k.l} className="inline-flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', k.c)} />
                {k.l}
              </span>
            ))}
          </div>
        </div>
        <RoundTimeline slots={slots} activeSlotId={currentAgentSlot?.id} />
      </section>

      {/* Equipe + histórico/ocorrências lado a lado */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-foreground">
            Agentes da equipe {team}{' '}
            <span className="font-normal text-muted-foreground">({shiftAgents.length})</span>
          </h3>
          <RoundAgentList agents={shiftAgents} />
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-foreground">
            Últimas ocorrências
            {metrics.open_incidents > 0 && (
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                {metrics.open_incidents} em aberto
              </span>
            )}
          </h3>
          <RoundHistory shiftId={shift.id} />
        </section>
      </div>

      <IncidentDialog open={incidentOpen} onOpenChange={setIncidentOpen} onSubmit={handleIncident} />
      <ShiftDivider
        open={dividerOpen}
        onOpenChange={setDividerOpen}
        startAt={new Date(shift.start_at)}
        endAt={new Date(shift.end_at)}
        intervalMinutes={shift.interval_minutes}
        agents={shiftAgents}
        sectors={sectors}
        onConfirm={async ({ strategy, agentIds, sectorIds }) => {
          const preview = api.generateSlotPreview({
            shiftId: shift.id, startAt: new Date(shift.start_at), endAt: new Date(shift.end_at),
            intervalMinutes: shift.interval_minutes, sectorIds, agentIds, strategy,
          });
          await api.saveSlots(shift.id, preview);
          invalidateAll();
          toast.success(`${preview.length} slots gerados.`);
        }}
      />
    </div>
  );
}

/** Diálogo simples de criação de turno (quando não há nenhum ativo). */
function NewShiftDialog({ open, onOpenChange, unitId, team, createdBy, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; unitId: string; team: string; createdBy: string; onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  if (!open) return null;
  const handleCreate = async () => {
    setSaving(true);
    try {
      const start = new Date();
      const end = new Date(start.getTime() + 12 * 60 * 60_000);
      await api.createShift({ unit_id: unitId, team, start_at: start.toISOString(), end_at: end.toISOString(), interval_minutes: 15, created_by: createdBy });
      onCreated();
      onOpenChange(false);
      toast.success('Turno de rondas criado (12h, quartos de hora).');
    } catch (e: any) {
      toast.error(e?.message ?? 'Não foi possível criar o turno.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-foreground">Criar turno de 12h</h3>
        <p className="mt-1 text-sm text-muted-foreground">Começa agora, divide em quartos de hora (15min). Você pode ajustar a distribuição depois.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving}>{saving ? 'Criando...' : 'Criar turno'}</Button>
        </div>
      </div>
    </div>
  );
}
