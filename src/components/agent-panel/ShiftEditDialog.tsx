import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompactTimeField } from '@/components/ui/compact-time-field';
import { AlertTriangle, Loader2, Moon, Trash2 } from 'lucide-react';


export type ShiftEditRecord = {
  id?: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_type: string;
  is_vacation: boolean;
  status?: string;
  notes?: string | null;
};

interface ShiftEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftDate: Date;
  shift?: ShiftEditRecord | null;
  agentId: string;
  onSaved?: () => void;
}

export type ShiftKind = 'regular' | 'night' | '24h' | 'vacation';

export const KIND_DEFAULTS: Record<ShiftKind, { start: string; end: string }> = {
  '24h': { start: '07:00', end: '07:00' },
  regular: { start: '07:00', end: '19:00' },
  night: { start: '19:00', end: '07:00' },
  vacation: { start: '00:00', end: '00:00' },
};

export const KIND_LABEL: Record<ShiftKind, string> = {
  '24h': 'Plantão 24h (07→07 dia seguinte)',
  regular: 'Diurno 12h (07→19) — folga especial',
  night: 'Noturno 12h (19→07 dia seguinte) — folga especial',
  vacation: 'Folga / Férias / Licença',
};

export function inferKind(s?: ShiftEditRecord | null): ShiftKind {
  if (!s) return '24h';
  if (s.is_vacation) return 'vacation';
  const st = s.start_time?.slice(0, 5);
  const en = s.end_time?.slice(0, 5);
  if (st === '07:00' && en === '07:00') return '24h';
  if (st === '19:00' && en === '07:00') return 'night';
  if (st === '22:00' && en === '06:00') return 'night';
  if (st === '07:00' && en === '19:00') return 'regular';
  return '24h';
}

const toMinutes = (value: string) => {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

export function shiftCrossesDay(kind: ShiftKind, startTime: string, endTime: string): boolean {
  if (kind === 'vacation') return false;
  if (kind === '24h') return true;
  return toMinutes(endTime) <= toMinutes(startTime);
}

export function shiftDurationMinutes(kind: ShiftKind, startTime: string, endTime: string): number {
  if (kind === 'vacation') return 0;
  if (kind === '24h') return 24 * 60;
  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);
  return endMin <= startMin ? 24 * 60 - startMin + endMin : endMin - startMin;
}

export function isNightShiftSelection(kind: ShiftKind, startTime: string, endTime: string): boolean {
  if (kind === 'vacation' || kind === '24h') return false;
  if (kind === 'night') return true;
  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);
  return endMin <= startMin && startMin >= 19 * 60 && endMin <= 7 * 60;
}

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM');
const formSchema = z
  .object({
    kind: z.enum(['regular', 'night', '24h', 'vacation']),
    start_time: timeSchema,
    end_time: timeSchema,
  })
  .refine((v) => v.kind === 'vacation' || v.kind === '24h' || v.start_time !== v.end_time, {
    message: 'Início e fim não podem ser iguais',
    path: ['end_time'],
  });

export function ShiftEditDialog({ open, onOpenChange, shiftDate, shift, agentId, onSaved }: ShiftEditDialogProps) {
  const [kind, setKind] = useState<ShiftKind>(inferKind(shift));
  const [startTime, setStartTime] = useState(shift?.start_time?.slice(0, 5) || '07:00');
  const [endTime, setEndTime] = useState(shift?.end_time?.slice(0, 5) || '07:00');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // Trava explícita: só permite gravar como folga/férias/licença após o
  // operador reconfirmar. Impede inserção acidental (bug relatado em produção).
  const [vacationAck, setVacationAck] = useState(false);

  useEffect(() => {
    return () => {
      document.body.style.pointerEvents = '';
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const k = inferKind(shift);
    setKind(k);
    setStartTime(shift?.start_time?.slice(0, 5) || KIND_DEFAULTS[k].start);
    setEndTime(shift?.end_time?.slice(0, 5) || KIND_DEFAULTS[k].end);
    // Se o registro JÁ era vacation, considera reconhecido; caso contrário exige nova confirmação.
    setVacationAck(k === 'vacation');
  }, [open, shift]);

  const handleKindChange = (next: ShiftKind) => {
    setKind(next);
    const d = KIND_DEFAULTS[next];
    setStartTime(d.start);
    setEndTime(d.end);
    // Ao trocar para vacation exige nova confirmação explícita.
    setVacationAck(false);
    if (next === 'night') {
      const nextDay = new Date(shiftDate);
      nextDay.setDate(nextDay.getDate() + 1);
      toast.info(`Plantão noturno identificado: ${d.start} de ${format(shiftDate, 'dd/MM/yyyy', { locale: ptBR })} → ${d.end} de ${format(nextDay, 'dd/MM/yyyy', { locale: ptBR })}.`);
    }
  };

  const nightMismatch = false;
  const dateStr = format(shiftDate, 'yyyy-MM-dd');
  const isNew = !shift?.id;

  // Cross-day: 24h sempre atravessa; noturno atravessa se fim <= início.
  const crossesDay = shiftCrossesDay(kind, startTime, endTime);
  const durationMin = shiftDurationMinutes(kind, startTime, endTime);
  const isNightPlan = isNightShiftSelection(kind, startTime, endTime);
  const durationLabel = `${Math.floor(durationMin / 60)}h${durationMin % 60 ? String(durationMin % 60).padStart(2, '0') : ''}`;
  const nextDay = new Date(shiftDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const endDateLabel = crossesDay
    ? format(nextDay, "dd/MM/yyyy", { locale: ptBR })
    : format(shiftDate, "dd/MM/yyyy", { locale: ptBR });
  const rangeSummary = kind === 'vacation'
    ? 'Dia inteiro (folga/férias/licença)'
    : `${startTime} de ${format(shiftDate, "dd/MM", { locale: ptBR })} → ${endTime} de ${format(crossesDay ? nextDay : shiftDate, "dd/MM", { locale: ptBR })}${crossesDay ? ' (dia seguinte)' : ''} · ${durationLabel}`;

  const performSave = async () => {
    setConfirmOpen(false);
    const parsed = formSchema.safeParse({ kind, start_time: startTime, end_time: endTime });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Dados inválidos');
      return;
    }
    // Trava anti-erro: não persiste vacation sem reconhecimento explícito do operador.
    if (kind === 'vacation' && !vacationAck) {
      toast.error('Marque a confirmação de folga/férias/licença antes de salvar.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        agent_id: agentId,
        shift_date: dateStr,
        start_time: kind === 'vacation' ? '00:00' : `${startTime}:00`,
        end_time: kind === 'vacation' ? '00:00' : `${endTime}:00`,
        shift_type: kind === 'vacation' ? 'vacation' : kind,
        is_vacation: kind === 'vacation',
        status: 'scheduled',
      };
      const { error } = shift?.id
        ? await supabase.from('agent_shifts').update(payload).eq('id', shift.id)
        : await supabase.from('agent_shifts').upsert(payload, { onConflict: 'agent_id,shift_date' });
      if (error) throw error;
      toast.success(isNew ? 'Plantão cadastrado' : 'Plantão alterado');
      // Defer parent close to next tick so the nested AlertDialog fully unmounts
      // before Radix tries to release the pointer-events lock on <body>.
      setTimeout(() => {
        document.body.style.pointerEvents = '';
        onOpenChange(false);
        onSaved?.();
      }, 50);
    } catch (e: any) {

      toast.error(e?.message || 'Falha ao salvar plantão');
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async () => {
    if (!shift?.id) return;
    setDeleteOpen(false);
    setSaving(true);
    try {
      const { error } = await supabase.from('agent_shifts').delete().eq('id', shift.id);
      if (error) throw error;
      toast.success('Plantão excluído');
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao excluir');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setConfirmOpen(false);
          setDeleteOpen(false);
          document.body.style.pointerEvents = '';
        }
        onOpenChange(nextOpen);
      }}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto bg-slate-900 border-slate-700 text-slate-100 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-amber-300 capitalize">
              {isNew ? 'Cadastrar plantão' : 'Editar plantão'} — {format(shiftDate, "dd/MM/yyyy", { locale: ptBR })}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              {format(shiftDate, "EEEE", { locale: ptBR })}. Ajuste tipo e horário; a alteração pede confirmação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="shift-kind" className="text-xs uppercase tracking-wide text-slate-400">Tipo de turno</Label>
              <Select value={kind} onValueChange={(v) => handleKindChange(v as ShiftKind)}>
                <SelectTrigger id="shift-kind" className="bg-slate-800 border-slate-700 min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[80] bg-slate-900 border-slate-700 max-w-[calc(100vw-1rem)]">
                  {(Object.keys(KIND_LABEL) as ShiftKind[]).map((k) => (
                    <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {kind !== 'vacation' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="start-time" className="text-xs uppercase tracking-wide text-slate-400">Início</Label>
                  <CompactTimeField
                    id="start-time"
                    value={startTime}
                    onChange={setStartTime}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-time" className="text-xs uppercase tracking-wide text-slate-400">Fim</Label>
                  <CompactTimeField
                    id="end-time"
                    value={endTime}
                    onChange={setEndTime}
                  />
                </div>
              </div>
            )}


            {kind === 'vacation' && (
              <div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 space-y-2">
                <div className="flex items-start gap-2 text-[12px] text-amber-100">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-300" />
                  <span>
                    <strong className="text-amber-200 block mb-0.5">Registro sensível — folga, férias ou licença.</strong>
                    Esta ação cadastra o dia inteiro como afastamento e aparece na escala da equipe.
                    Marque a confirmação abaixo somente se realmente for uma folga/férias/licença deste agente.
                  </span>
                </div>
                <label className="flex items-start gap-2 cursor-pointer rounded border border-amber-500/40 bg-slate-900/60 px-2.5 py-2">
                  <input
                    type="checkbox"
                    checked={vacationAck}
                    onChange={(e) => setVacationAck(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-amber-500"
                  />
                  <span className="text-[12px] text-amber-50">
                    Confirmo que este dia é realmente <strong>folga / férias / licença</strong> deste agente.
                  </span>
                </label>
              </div>
            )}

            <div
              className="text-[12px] leading-snug rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-amber-100"
              aria-live="polite"
              data-testid="shift-range-summary"
            >
              <span className="uppercase tracking-wide text-[10px] text-amber-300/80 block mb-0.5">Resumo</span>
              {rangeSummary}
            </div>

            {isNightPlan && (
              <div
                className="flex items-start gap-2 rounded border border-indigo-400/40 bg-indigo-500/10 px-3 py-2 text-[11px] leading-snug text-indigo-100"
                role="status"
                aria-live="polite"
                data-testid="night-shift-alert"
              >
                <Moon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-indigo-300" />
                <span>
                  <strong className="text-indigo-200">Plantão noturno identificado.</strong>{' '}
                  Inicia em {format(shiftDate, 'dd/MM/yyyy', { locale: ptBR })} às {startTime} e encerra em {endDateLabel} às {endTime}{crossesDay ? ' (dia seguinte)' : ''}.
                </span>
              </div>
            )}

            {nightMismatch && (
              <div className="flex items-start gap-2 text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded px-2.5 py-1.5">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>Durante a janela noturna (22:00–06:00) o sistema exige 22:00 → 06:00. Só o master pode sobrescrever.</span>
              </div>
            )}

            {confirmOpen && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                <p className="font-semibold text-amber-300">Confirmar alteração do plantão?</p>
                <p className="mt-1 text-amber-100/90">{KIND_LABEL[kind]} · {rangeSummary}</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
            {shift?.id ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                disabled={saving}
                className="min-h-11"
              >
                <Trash2 className="h-4 w-4 mr-1" /> Excluir
              </Button>
            ) : <span />}
            {confirmOpen ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmOpen(false)}
                  disabled={saving}
                  className="border-slate-700 text-slate-200 hover:bg-slate-800 min-h-11"
                >
                  Voltar
                </Button>
                <Button
                  size="sm"
                  onClick={performSave}
                  disabled={saving}
                  className="bg-amber-500 text-black hover:bg-amber-400 min-h-11"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                  className="border-slate-700 text-slate-200 hover:bg-slate-800 min-h-11"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={() => setConfirmOpen(true)}
                  disabled={saving || (kind === 'vacation' && !vacationAck)}
                  className="bg-amber-500 text-black hover:bg-amber-400 min-h-11"
                >
                  Salvar alterações
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plantão de {format(shiftDate, "dd/MM/yyyy", { locale: ptBR })}?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Esta ação não pode ser desfeita. O registro será removido da escala.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={performDelete} className="bg-rose-600 text-white hover:bg-rose-500">
              Excluir plantão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
