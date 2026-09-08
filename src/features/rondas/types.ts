export type PatrolSlotStatus = 'pending' | 'active' | 'completed' | 'late' | 'incident' | 'cancelled';
export type PatrolShiftStatus = 'active' | 'completed' | 'cancelled';
export type IncidentSeverity = 'baixa' | 'media' | 'alta' | 'critica';
export type IncidentStatus = 'aberta' | 'em_acompanhamento' | 'resolvida';
export type DistributionStrategy = 'blocks' | 'rotative' | 'manual';

export interface PatrolSector {
  id: string;
  unit_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  active: boolean;
}

export interface PatrolShift {
  id: string;
  unit_id: string;
  team: string;
  start_at: string;
  end_at: string;
  interval_minutes: number;
  status: PatrolShiftStatus;
  created_by: string | null;
  created_at: string;
}

export interface PatrolAgentAssignment {
  id: string;
  shift_id: string;
  agent_id: string;
  position: string | null;
  status: 'available' | 'in_round' | 'standby' | 'unavailable';
  agent?: { id: string; name: string; matricula: string | null; avatar_url: string | null };
}

export interface PatrolSlot {
  id: string;
  shift_id: string;
  agent_id: string | null;
  sector_id: string | null;
  scheduled_start: string;
  scheduled_end: string;
  started_at: string | null;
  completed_at: string | null;
  paused_at: string | null;
  paused_seconds: number;
  status: PatrolSlotStatus;
  notes: string | null;
  agent?: { id: string; name: string; avatar_url: string | null } | null;
  sector?: { id: string; name: string } | null;
}

export interface PatrolIncident {
  id: string;
  slot_id: string | null;
  unit_id: string;
  agent_id: string | null;
  type: string;
  severity: IncidentSeverity;
  description: string | null;
  status: IncidentStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface PatrolMetrics {
  total_slots: number;
  completed_slots: number;
  pending_slots: number;
  late_slots: number;
  open_incidents: number;
  coverage_pct: number;
}
