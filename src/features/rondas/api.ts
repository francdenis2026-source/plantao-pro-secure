import { supabase } from '@/integrations/supabase/client';
import type {
  PatrolShift, PatrolSlot, PatrolSector, PatrolAgentAssignment, PatrolIncident, PatrolMetrics,
  DistributionStrategy, IncidentSeverity,
} from './types';

const sb = supabase as any;

// ---------- Sectors ----------

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
  unit_id: string; team: string; start_at: string; end_at: string; interval_minutes: number; created_by: string;
}): Promise<PatrolShift> {
  const { data, error } = await sb.from('patrol_shifts').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function closeShift(shiftId: string): Promise<void> {
  const { error } = await sb.from('patrol_shifts').update({ status: 'completed' }).eq('id', shiftId);
  if (error) throw error;
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
