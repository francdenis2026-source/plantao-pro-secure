import { supabase } from '@/integrations/supabase/client';
import { parseISO, isBefore, isEqual } from 'date-fns';

export interface ConflictCheckInput {
  agentId: string;
  shiftDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  excludeShiftId?: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: Array<{
    type: 'shift_overlap' | 'leave_overlap' | 'invalid_time';
    message: string;
    detail?: string;
  }>;
}

/**
 * Valida um plantão contra:
 * - Outros plantões do mesmo agente na mesma data
 * - Folgas aprovadas que cobrem a data
 * - Horários inválidos (start >= end no mesmo dia, exceto turnos noturnos que viram madrugada)
 */
export async function checkShiftConflicts(input: ConflictCheckInput): Promise<ConflictResult> {
  const conflicts: ConflictResult['conflicts'] = [];

  // 1) Validação de horários
  if (input.startTime && input.endTime) {
    const [sh, sm] = input.startTime.split(':').map(Number);
    const [eh, em] = input.endTime.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    // Turnos noturnos têm end < start (vira o dia). Só bloquear se forem iguais.
    if (startMin === endMin) {
      conflicts.push({
        type: 'invalid_time',
        message: 'Horário de início igual ao de término.',
      });
    }
  }

  // 2) Plantão duplicado na mesma data
  let dupQuery = supabase
    .from('agent_shifts')
    .select('id, start_time, end_time, is_vacation')
    .eq('agent_id', input.agentId)
    .eq('shift_date', input.shiftDate);

  if (input.excludeShiftId) {
    dupQuery = dupQuery.neq('id', input.excludeShiftId);
  }

  const { data: existing } = await dupQuery;
  if (existing && existing.length > 0) {
    existing.forEach((s) => {
      conflicts.push({
        type: 'shift_overlap',
        message: 'Já existe um registro para essa data.',
        detail: s.is_vacation
          ? 'Marcação de folga/férias já cadastrada.'
          : `Plantão ${s.start_time ?? '--'}–${s.end_time ?? '--'} já cadastrado.`,
      });
    });
  }

  // 3) Sobreposição com folgas aprovadas
  const { data: leaves } = await supabase
    .from('agent_leaves')
    .select('id, start_date, end_date, leave_type, status')
    .eq('agent_id', input.agentId)
    .eq('status', 'approved')
    .lte('start_date', input.shiftDate)
    .gte('end_date', input.shiftDate);

  if (leaves && leaves.length > 0) {
    leaves.forEach((l) => {
      conflicts.push({
        type: 'leave_overlap',
        message: `Conflito com folga aprovada (${l.leave_type}).`,
        detail: `Período: ${l.start_date} até ${l.end_date}`,
      });
    });
  }

  return { hasConflict: conflicts.length > 0, conflicts };
}

/** Helper: valida overlap simples entre 2 intervalos de datas. */
export function datesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = parseISO(aStart);
  const ae = parseISO(aEnd);
  const bs = parseISO(bStart);
  const be = parseISO(bEnd);
  return !(isBefore(ae, bs) || isBefore(be, as)) || isEqual(as, bs) || isEqual(ae, be);
}
