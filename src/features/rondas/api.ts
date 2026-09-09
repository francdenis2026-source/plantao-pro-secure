import { supabase } from '@/integrations/supabase/client';
import type {
  PatrolShift, PatrolSlot, PatrolSector, PatrolAgentAssignment, PatrolIncident, PatrolMetrics,
  DistributionStrategy, IncidentSeverity,
} from './types';

const sb = supabase as any;

// ---------- Sectors ----------

/** Lista enxuta de unidades — alimenta o seletor de visitante no Gestor de
 * Rondas, para não pedir o UUID da unidade digitado à mão. */
export async function listUnitsForPicker(): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await sb.from('units').select('id, name').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function listSectors(unitId: string): Promise<PatrolSector[]> {
  const { data, error } = await sb
    .from('patrol_sectors')
    .select('*')
    .eq('unit_id', unitId)
    .eq('active', true)
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

// ---------- Shifts ----------

export async function getActiveShift(unitId: string, team: string): Promise<PatrolShift | null> {
  const { data, error } = await sb
    .from('patrol_shifts')
    .select('*')
    .eq('unit_id', unitId)
    .eq('team', team)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createShift(input: {
  unit_id: string; team: string; start_at: string; end_at: string; interval_minutes: number; created_by: string | null;
}): Promise<PatrolShift> {
  const { data, error } = await sb.from('patrol_shifts').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function closeShift(shiftId: string): Promise<void> {
  const { error } = await sb.from('patrol_shifts').update({ status: 'completed' }).eq('id', shiftId);
  if (error) throw error;
}

// ---------- Team roster (for assigning to a new shift) ----------

export async function listUnitTeamAgents(unitId: string, team: string): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await sb
    .from('agents')
    .select('id, name')
    .eq('unit_id', unitId)
    .eq('team', team)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

// ---------- Shift agents ----------

export async function assignAgentsToShift(shiftId: string, agentIds: string[]): Promise<void> {
  const rows = agentIds.map((agent_id) => ({ shift_id: shiftId, agent_id }));
  const { error } = await sb.from('patrol_agents').upsert(rows, { onConflict: 'shift_id,agent_id' });
  if (error) throw error;
}

export async function listShiftAgents(shiftId: string): Promise<PatrolAgentAssignment[]> {
  const { data, error } = await sb
    .from('patrol_agents')
    .select('*, agent:agents(id, name, matricula, avatar_url)')
    .eq('shift_id', shiftId);
  if (error) throw error;
  return data ?? [];
}

// ---------- Slot generation (distribution strategies) ----------

interface GenerateSlotsInput {
  shiftId: string;
  startAt: Date;
  endAt: Date;
  intervalMinutes: number;
  sectorIds: string[];
  agentIds: string[];
  strategy: DistributionStrategy;
}

/** Gera a grade de slots em memória (preview) — nada é gravado ainda. */
export function generateSlotPreview(input: GenerateSlotsInput): Array<{
  scheduled_start: Date; scheduled_end: Date; agent_id: string | null; sector_id: string | null;
}> {
  const { startAt, endAt, intervalMinutes, sectorIds, agentIds, strategy } = input;
  const slots: Array<{ scheduled_start: Date; scheduled_end: Date; agent_id: string | null; sector_id: string | null }> = [];
  const totalMs = endAt.getTime() - startAt.getTime();
  const stepMs = intervalMinutes * 60_000;
  const stepCount = Math.max(1, Math.round(totalMs / stepMs));
  const sectors = sectorIds.length > 0 ? sectorIds : [null];

  if (strategy === 'blocks') {
    // Divide o turno em blocos iguais, um agente por bloco, cobrindo todos os setores no bloco.
    const agents = agentIds.length > 0 ? agentIds : [null];
    const blockCount = agents.length;
    const blockMs = totalMs / blockCount;
    for (let b = 0; b < blockCount; b++) {
      const blockStart = new Date(startAt.getTime() + b * blockMs);
      const blockEnd = new Date(startAt.getTime() + (b + 1) * blockMs);
      let cursor = new Date(blockStart);
      let sectorIdx = 0;
      while (cursor < blockEnd) {
        const next = new Date(Math.min(cursor.getTime() + stepMs, blockEnd.getTime()));
        slots.push({
          scheduled_start: new Date(cursor),
          scheduled_end: next,
          agent_id: agents[b] ?? null,
          sector_id: sectors[sectorIdx % sectors.length],
        });
        sectorIdx++;
        cursor = next;
      }
    }
    return slots;
  }

  if (strategy === 'rotative') {
    // Cada slot vai para o próximo agente da lista, em ordem circular.
    const agents = agentIds.length > 0 ? agentIds : [null];
    let cursor = new Date(startAt);
    let i = 0;
    while (cursor < endAt) {
      const next = new Date(Math.min(cursor.getTime() + stepMs, endAt.getTime()));
      slots.push({
        scheduled_start: new Date(cursor),
        scheduled_end: next,
        agent_id: agents[i % agents.length],
        sector_id: sectors[i % sectors.length],
      });
      i++;
      cursor = next;
    }
    return slots;
  }

  // manual: apenas a grade de horários/setores; agente fica null (atribuído depois um a um).
  let cursor = new Date(startAt);
  let i = 0;
  while (cursor < endAt) {
    const next = new Date(Math.min(cursor.getTime() + stepMs, endAt.getTime()));
    slots.push({ scheduled_start: new Date(cursor), scheduled_end: next, agent_id: null, sector_id: sectors[i % sectors.length] });
    i++;
    cursor = next;
  }
  return slots;
}

export async function saveSlots(shiftId: string, slots: ReturnType<typeof generateSlotPreview>): Promise<void> {
  const rows = slots.map((s) => ({
    shift_id: shiftId,
    agent_id: s.agent_id,
    sector_id: s.sector_id,
    scheduled_start: s.scheduled_start.toISOString(),
    scheduled_end: s.scheduled_end.toISOString(),
  }));
  const { error } = await sb.from('patrol_slots').insert(rows);
  if (error) throw error;
}

// ---------- Scheduled rounds (programação recorrente, criada no Admin) ----------
// Liga o agendador (tabela scheduled_rounds, editada em /admin) aos turnos reais
// que o Gestor de Rondas usa (patrol_shifts/patrol_slots). Sem depender de cron
// no banco — é materializado sob demanda, com um clique, a partir desta tela.

export interface ScheduledRoundRow {
  id: string;
  unit_id: string | null;
  team: string;
  name: string;
  round_start_time: string | null;
  round_end_time: string | null;
  round_interval_min: number;
  ronda_duration_min: number;
  recur_weekdays: number[];
  is_enabled: boolean;
  last_triggered_at: string | null;
}

export async function listScheduledRounds(unitId: string, team: string): Promise<ScheduledRoundRow[]> {
  const { data, error } = await sb
    .from('scheduled_rounds')
    .select('id, unit_id, team, name, round_start_time, round_end_time, round_interval_min, ronda_duration_min, recur_weekdays, is_enabled, last_triggered_at')
    .eq('unit_id', unitId)
    .in('team', [team, 'ALL'])
    .eq('is_enabled', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

/** Transforma uma programação em um turno real de hoje: cria o patrol_shift,
 * atribui a equipe inteira e já gera a grade de quartos de hora (rotativo). */
export async function activateScheduledRound(row: ScheduledRoundRow, team: string, createdBy: string | null): Promise<PatrolShift> {
  const now = new Date();
  let start = now;
  let end: Date;
  if (row.round_start_time && row.round_end_time) {
    const [sh, sm] = row.round_start_time.split(':').map(Number);
    const [eh, em] = row.round_end_time.split(':').map(Number);
    start = new Date(now);
    start.setHours(sh, sm, 0, 0);
    end = new Date(now);
    end.setHours(eh, em, 0, 0);
    if (end <= start) end.setDate(end.getDate() + 1); // turno que vira a noite
  } else {
    end = new Date(start.getTime() + (row.ronda_duration_min || 60) * 60_000);
  }
  const intervalMinutes = row.round_interval_min || 15;

  const shift = await createShift({
    unit_id: row.unit_id!,
    team,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    interval_minutes: intervalMinutes,
    created_by: createdBy,
  });

  const roster = await listUnitTeamAgents(row.unit_id!, team);
  if (roster.length > 0) {
    await assignAgentsToShift(shift.id, roster.map((a) => a.id));
  }

  const preview = generateSlotPreview({
    shiftId: shift.id,
    startAt: start,
    endAt: end,
    intervalMinutes,
    sectorIds: [],
    agentIds: roster.map((a) => a.id),
    strategy: 'rotative',
  });
  if (preview.length > 0) await saveSlots(shift.id, preview);

  await sb.from('scheduled_rounds').update({ last_triggered_at: new Date().toISOString() }).eq('id', row.id);

  return shift;
}

// ---------- Slots (read + lifecycle) ----------

export async function listShiftSlots(shiftId: string): Promise<PatrolSlot[]> {
  const { data, error } = await sb
    .from('patrol_slots')
    .select('*, agent:agents(id, name, avatar_url), sector:patrol_sectors(id, name)')
    .eq('shift_id', shiftId)
    .order('scheduled_start');
  if (error) throw error;
  return data ?? [];
}

export async function markLateSlots(shiftId: string): Promise<void> {
  const { error } = await sb.rpc('mark_late_patrol_slots', { p_shift_id: shiftId });
  if (error) throw error;
}

export async function startSlot(slotId: string): Promise<PatrolSlot> {
  const { data, error } = await sb.rpc('start_patrol_slot', { p_slot_id: slotId });
  if (error) throw error;
  return data;
}
export async function pauseSlot(slotId: string): Promise<PatrolSlot> {
  const { data, error } = await sb.rpc('pause_patrol_slot', { p_slot_id: slotId });
  if (error) throw error;
  return data;
}
export async function resumeSlot(slotId: string): Promise<PatrolSlot> {
  const { data, error } = await sb.rpc('resume_patrol_slot', { p_slot_id: slotId });
  if (error) throw error;
  return data;
}
export async function completeSlot(slotId: string): Promise<PatrolSlot> {
  const { data, error } = await sb.rpc('complete_patrol_slot', { p_slot_id: slotId });
  if (error) throw error;
  return data;
}
export async function extendSlot(slotId: string, minutes = 5): Promise<PatrolSlot> {
  const { data, error } = await sb.rpc('extend_patrol_slot', { p_slot_id: slotId, p_minutes: minutes });
  if (error) throw error;
  return data;
}

export async function getMetrics(shiftId: string): Promise<PatrolMetrics> {
  const { data, error } = await sb.rpc('get_patrol_metrics', { p_shift_id: shiftId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? { total_slots: 0, completed_slots: 0, pending_slots: 0, late_slots: 0, open_incidents: 0, coverage_pct: 0 };
}

// ---------- Incidents ----------

export async function createIncident(input: {
  slot_id: string | null; unit_id: string; agent_id: string | null; type: string; severity: IncidentSeverity; description: string;
}): Promise<PatrolIncident> {
  const { data, error } = await sb.from('patrol_incidents').insert(input).select().single();
  if (error) throw error;
  if (input.slot_id) {
    await sb.from('patrol_slots').update({ status: 'incident' }).eq('id', input.slot_id);
    await sb.from('patrol_events').insert({ slot_id: input.slot_id, event_type: 'incident', agent_id: input.agent_id, metadata: { incident_id: data.id } });
  }
  return data;
}

export async function listUnitIncidents(unitId: string, limit = 20): Promise<PatrolIncident[]> {
  const { data, error } = await sb
    .from('patrol_incidents')
    .select('*')
    .eq('unit_id', unitId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function resolveIncident(id: string): Promise<void> {
  const { error } = await sb.from('patrol_incidents').update({ status: 'resolvida', resolved_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
