import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
// Ícones inline via SVG mantêm o visual leve e profissional
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Sun, Moon, Palmtree, AlertCircle, CheckCircle2, XCircle, Clock, FileText, Info, Coffee } from 'lucide-react';
import { JourneyDetailsDialog, type JourneyDetailsData } from './JourneyDetailsDialog';
import { ShiftSchedulePDFExport } from './ShiftSchedulePDFExport';
import { ShiftEditDialog, type ShiftEditRecord } from './ShiftEditDialog';


interface ShiftCalendarOverviewProps {
  agentId: string;
}

interface Shift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string | null;
  status: string;
  is_vacation: boolean;
  notes: string | null;
}

interface BHEntry {
  id: string;
  created_at: string;
  hours: number;
  operation_type: string;
}

interface LeaveRequest {
  id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: string;
}

type DayType = 'shift' | 'bh' | 'leave' | 'rest' | 'today' | 'vacation';

interface DayInfo {
  date: Date;
  types: DayType[];
  shift?: Shift;
  bhEntry?: BHEntry;
  leave?: LeaveRequest;
}

export function ShiftCalendarOverview({ agentId }: ShiftCalendarOverviewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filter, setFilter] = useState<'all' | 'shift' | 'leave'>('all');

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [bhEntries, setBhEntries] = useState<BHEntry[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<JourneyDetailsData | null>(null);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftModalData, setShiftModalData] = useState<{
    date: Date;
    shift: Shift;
    status: 'done' | 'missed' | 'scheduled';
    startStr: string;
    endStr: string;
  } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<{ date: Date; shift: ShiftEditRecord | null } | null>(null);

  // Local "today" (fuso do usuário) — usado para saber se uma data já passou
  const localToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isPastLocalDay = (day: Date) => {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < localToday.getTime();
  };

  const computeShiftStatus = (day: Date, shift: Shift): 'done' | 'missed' | 'scheduled' => {
    if (shift.status === 'completed' || shift.status === 'compensated') return 'done';
    if (shift.status === 'missed') return 'missed';
    // Passado com status 'scheduled' => considerar cumprido
    if (isPastLocalDay(day) && shift.status === 'scheduled') return 'done';
    return 'scheduled';
  };

  // Classifica a folga de um dia SEM plantão.
  // Ciclo padrão: plantão 07:00 → 07:00 (24h) + 3 dias de descanso (72h).
  //  - Dia logo após o plantão (D+1): a madrugada 00:00-07:00 ainda está no plantão
  //    anterior, restando ~17h livres → chamamos "Meia folga (12h)".
  //  - Dias D+2 e D+3: totalmente livres → "Folga integral (24h)".
  //  - Dia antes do próximo plantão: apenas a madrugada é livre — porém esse
  //    dia É o próprio plantão, então já foi tratado como shift day.
  const classifyRestDay = (
    day: Date,
    allShifts: Shift[],
  ): {
    kind: 'off_24h' | 'half_post' | 'off_12h_exceptional' | 'none';
    prev?: Shift;
    next?: Shift;
    windowLabel?: string;
  } => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const nonVac = allShifts.filter((s) => !s.is_vacation);
    const prev = [...nonVac]
      .filter((s) => s.shift_date < dateStr)
      .sort((a, b) => (a.shift_date < b.shift_date ? 1 : -1))[0];
    const next = nonVac
      .filter((s) => s.shift_date > dateStr)
      .sort((a, b) => (a.shift_date < b.shift_date ? -1 : 1))[0];

    if (!prev && !next) return { kind: 'none' };

    const diffFromPrev = prev
      ? Math.round(
          (parseISO(dateStr).getTime() - parseISO(prev.shift_date).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : Infinity;

    const durationOf = (s?: Shift) => {
      if (!s?.start_time || !s?.end_time) return null;
      const [sh, sm] = s.start_time.slice(0, 5).split(':').map(Number);
      const [eh, em] = s.end_time.slice(0, 5).split(':').map(Number);
      let mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins <= 0) mins += 24 * 60;
      return Math.round(mins / 60);
    };

    // Folga excepcional 07:00–19:00 → dia sem plantão logo após um plantão
    // noturno excepcional de 12h (19→07). O período diurno fica integralmente
    // livre, sem madrugada no serviço.
    if (prev && diffFromPrev === 1) {
      const pStart = prev.start_time?.slice(0, 5) ?? '07:00';
      const pEnd = prev.end_time?.slice(0, 5) ?? '07:00';
      const pDur = durationOf(prev);
      if (pDur === 12 && pStart === '19:00' && pEnd === '07:00') {
        return { kind: 'off_12h_exceptional', prev, next, windowLabel: '07:00–19:00' };
      }
      // Plantão anterior 24h (07→07 ou similar): madrugada de hoje ainda no serviço
      if (pEnd <= pStart) return { kind: 'half_post', prev, next };
    }

    return { kind: 'off_24h', prev, next };
  };


  // Estado para divergências detectadas pelo backend
  type Divergence = {
    divergence_type: string;
    shift_date: string;
    expected_date: string | null;
    notes: string | null;
  };
  const [divergences, setDivergences] = useState<Divergence[]>([]);

  const checkDivergences = async () => {
    try {
      const { data, error } = await supabase.rpc('check_agent_shift_divergences', {
        p_agent_id: agentId,
        p_months_ahead: 3,
      });
      if (!error && Array.isArray(data)) {
        setDivergences(data as any);
      }
    } catch (e) {
      // silencioso — validação é auxiliar
    }
  };

  const buildDT = (dateStr: string, time: string | null, fallback: string) => {
    const [h, m] = (time || fallback).split(':').map(Number);
    const d = parseISO(dateStr);
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  };

  const buildJourneyFromShifts = (day: Date, localShifts: Shift[]): JourneyDetailsData => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayShift = localShifts.find(s => s.shift_date === dateStr && !s.is_vacation);
    const prevShift = [...localShifts]
      .filter(s => s.shift_date < dateStr && !s.is_vacation)
      .sort((a, b) => (a.shift_date < b.shift_date ? 1 : -1))[0];

    let shiftStart: Date | null = null;
    let shiftEnd: Date | null = null;
    if (dayShift) {
      shiftStart = buildDT(dayShift.shift_date, dayShift.start_time, '07:00');
      shiftEnd = buildDT(dayShift.shift_date, dayShift.end_time, '19:00');
      if (shiftEnd <= shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1);
    }

    let restStart: Date | null = null;
    let restEnd: Date | null = null;
    if (prevShift) {
      const pStart = buildDT(prevShift.shift_date, prevShift.start_time, '19:00');
      const pEnd = buildDT(prevShift.shift_date, prevShift.end_time, '07:00');
      if (pEnd <= pStart) pEnd.setDate(pEnd.getDate() + 1);
      restStart = pEnd;
      restEnd = shiftStart ?? day;
    }

    return {
      targetDate: day,
      restStart,
      restEnd,
      shiftStart,
      shiftEnd,
      emptyMessage: !dayShift && !prevShift
        ? 'Sem plantão cadastrado para este dia. Revise o cadastro do agente na aba Configurações.'
        : undefined,
    };
  };

  // Busca sob demanda para permitir navegação por qualquer mês dentro do diálogo
  const fetchJourneyForDate = async (day: Date): Promise<JourneyDetailsData> => {
    const dateStr = format(day, 'yyyy-MM-dd');
    try {
      const { data: dayShifts } = await supabase
        .from('agent_shifts')
        .select('*')
        .eq('agent_id', agentId)
        .eq('shift_date', dateStr);
      const { data: prevShifts } = await supabase
        .from('agent_shifts')
        .select('*')
        .eq('agent_id', agentId)
        .lt('shift_date', dateStr)
        .eq('is_vacation', false)
        .order('shift_date', { ascending: false })
        .limit(1);
      const merged = [...((dayShifts || []) as Shift[]), ...((prevShifts || []) as Shift[])];
      return buildJourneyFromShifts(day, merged);
    } catch {
      return buildJourneyFromShifts(day, shifts);
    }
  };

  const openDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayShift = shifts.find((s) => s.shift_date === dateStr && !s.is_vacation);
    if (dayShift) {
      setShiftModalData({
        date: day,
        shift: dayShift,
        status: computeShiftStatus(day, dayShift),
        startStr: dayShift.start_time?.slice(0, 5) || '—',
        endStr: dayShift.end_time?.slice(0, 5) || '—',
      });
      setShiftModalOpen(true);
      return;
    }
    // Sem plantão: em dias futuros, abrir modal de cadastro/edição direto
    if (!isPastLocalDay(day)) {
      setEditData({ date: day, shift: null });
      setEditOpen(true);
      return;
    }
    setDetailData(buildJourneyFromShifts(day, shifts));
    setDetailOpen(true);
  };

  useEffect(() => {
    fetchData();
  }, [agentId, currentMonth]);

  // Roda a validação de divergências uma vez por agente (independente do mês)
  useEffect(() => {
    checkDivergences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      // Fetch shifts
      const { data: shiftData } = await supabase
        .from('agent_shifts')
        .select('*')
        .eq('agent_id', agentId)
        .gte('shift_date', monthStart)
        .lte('shift_date', monthEnd);

      // Fetch BH entries
      const { data: bhData } = await supabase
        .from('overtime_bank')
        .select('*')
        .eq('agent_id', agentId)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);

      // Fetch leaves
      const { data: leaveData } = await supabase
        .from('agent_leaves')
        .select('*')
        .eq('agent_id', agentId)
        .gte('start_date', monthStart)
        .lte('end_date', monthEnd);

      setShifts((shiftData || []) as Shift[]);
      setBhEntries((bhData || []) as BHEntry[]);
      setLeaves((leaveData || []) as LeaveRequest[]);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDayInfo = (date: Date): DayInfo => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const types: DayType[] = [];
    let shift: Shift | undefined;
    let bhEntry: BHEntry | undefined;
    let leave: LeaveRequest | undefined;

    // Check if today
    if (isToday(date)) {
      types.push('today');
    }

    // Check for shifts
    shift = shifts.find(s => s.shift_date === dateStr);
    if (shift) {
      if (shift.is_vacation) {
        types.push('vacation');
      } else {
        types.push('shift');
      }
    }

    // Check for BH entries
    bhEntry = bhEntries.find(b => b.created_at.split('T')[0] === dateStr);
    if (bhEntry) {
      types.push('bh');
    }

    // Check for leaves
    leave = leaves.find(l => {
      const start = parseISO(l.start_date);
      const end = parseISO(l.end_date);
      return date >= start && date <= end;
    });
    if (leave) {
      types.push('leave');
    }

    // If no types, it's a rest day
    if (types.length === 0 || (types.length === 1 && types[0] === 'today')) {
      types.push('rest');
    }

    return { date, types, shift, bhEntry, leave };
  };

  const getDayColors = (types: DayType[]): string => {
    if (types.includes('shift')) return 'bg-amber-500/30 border-amber-500/50 text-amber-400';
    if (types.includes('vacation')) return 'bg-purple-500/30 border-purple-500/50 text-purple-400';
    if (types.includes('leave')) return 'bg-blue-500/30 border-blue-500/50 text-blue-400';
    if (types.includes('bh')) return 'bg-green-500/30 border-green-500/50 text-green-400';
    return 'bg-slate-800/30 border-slate-700/30 text-muted-foreground';
  };

  const getDayMarker = (types: DayType[]) => {
    // Compact SVG marker (dot) — visually consistent and lightweight
    let fill: string | null = null;
    if (types.includes('shift')) fill = 'hsl(43 96% 56%)';
    else if (types.includes('vacation')) fill = 'hsl(270 91% 65%)';
    else if (types.includes('leave')) fill = 'hsl(217 91% 60%)';
    else if (types.includes('bh')) fill = 'hsl(142 71% 45%)';
    if (!fill) return null;
    return (
      <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden className="mt-0.5">
        <circle cx="3" cy="3" r="3" fill={fill} />
      </svg>
    );
  };


  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  // Get the day of week for the first day (0 = Sunday)
  const firstDayOfMonth = startOfMonth(currentMonth);
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Stats for the month
  const nonVacationShifts = shifts.filter((s) => !s.is_vacation);
  const shiftDays = nonVacationShifts.length;
  const vacationDays = shifts.filter((s) => s.is_vacation).length;
  const leaveDays = leaves.length;
  const totalBhHours = bhEntries.reduce((acc, b) => acc + (b.operation_type === 'credit' ? b.hours : -b.hours), 0);

  // Cumpridos vs Não cumpridos (para o mês exibido)
  let doneCount = 0;
  let missedCount = 0;
  for (const s of nonVacationShifts) {
    const d = parseISO(s.shift_date);
    const st = computeShiftStatus(d, s);
    if (st === 'done') doneCount++;
    else if (st === 'missed') missedCount++;
  }

  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden bg-slate-800/50 border-slate-700">
      {/* Fundo decorativo em SVG: moldura de calendário sem grid */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cal-frame" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <svg aria-hidden viewBox="0 0 100 100" className="pointer-events-none absolute -top-6 -right-6 h-28 w-28 opacity-20">
        <rect x="14" y="22" width="72" height="64" rx="6" stroke="url(#cal-frame)" strokeWidth="1.5" fill="none" />
        <line x1="14" y1="36" x2="86" y2="36" stroke="url(#cal-frame)" strokeWidth="1.5" />
        <line x1="32" y1="14" x2="32" y2="28" stroke="url(#cal-frame)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="68" y1="14" x2="68" y2="28" stroke="url(#cal-frame)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      <CardHeader className="pb-1.5 pt-2.5 px-3 relative">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 text-xs md:text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="text-primary">
              <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span>Calendário</span>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-amber-300 transition-colors"
                    aria-label="Ajuda do calendário"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[260px] bg-slate-900 border-slate-700 p-2.5 text-[11px] leading-snug">
                  <p className="font-semibold text-amber-300 mb-1">Como ler este calendário</p>
                  <ul className="space-y-1 text-slate-200 list-disc pl-3">
                    <li>Colunas: <b>D S T Q Q S S</b> (Dom → Sáb).</li>
                    <li>Se o mês começa numa <b>quarta</b>, o dia <b>01</b> aparece na 4ª coluna — coladinho ao <b>02</b>. É fácil confundir os dois; passe o mouse em cada célula para ver a data exata.</li>
                    <li><span className="text-emerald-300 font-semibold">Verde ✓</span>: plantão cumprido. <span className="text-rose-300 font-semibold">Vermelho ✕</span>: não cumprido. <span className="text-amber-300 font-semibold">Amarelo</span>: agendado.</li>
                    <li>Folgas: <span className="text-sky-300">24h</span> (dia integralmente livre) e <span className="text-indigo-300">12h</span> (meia folga pós-plantão, madrugada ainda no serviço).</li>
                    <li><span className="text-fuchsia-300 font-semibold">Excepcional 12h</span>: plantão pode ser <b>07→19</b> (diurno) ou <b>19→07</b> (noturno), com folga espelhada no outro turno. A duração real aparece no tooltip e no modal.</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {divergences.length > 0 && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="ml-1 inline-flex items-center gap-1 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-1.5 py-0.5 text-[9px] font-bold text-yellow-300"
                      aria-label="Divergências detectadas"
                    >
                      <AlertCircle className="h-2.5 w-2.5" /> {divergences.length}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[280px] bg-slate-900 border-slate-700 p-2.5 text-[11px]">
                    <p className="font-semibold text-yellow-300 mb-1">
                      {divergences.length} divergência(s) detectada(s) pelo backend
                    </p>
                    <p className="text-slate-300 mb-1.5">Comparação: <code className="text-amber-300">first_shift_date</code> + ciclo de 4 dias × plantões cadastrados (fuso America/Rio_Branco).</p>
                    <ul className="space-y-0.5 max-h-40 overflow-y-auto text-slate-200">
                      {divergences.slice(0, 8).map((d, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className={d.divergence_type === 'unexpected_shift' ? 'text-rose-300' : 'text-amber-300'}>
                            {d.divergence_type === 'unexpected_shift' ? '✕' : '○'}
                          </span>
                          <span>
                            <b className="tabular-nums">{d.shift_date}</b>
                            {' — '}
                            {d.divergence_type === 'unexpected_shift' ? 'fora do ciclo' : 'esperado no ciclo, sem cadastro'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </CardTitle>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <div className="flex items-center rounded-md border border-slate-700 bg-slate-900/60 p-0.5" role="group" aria-label="Filtrar tipos">
              {(['all', 'shift', 'leave'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded transition-colors ${
                    filter === f ? 'bg-amber-500/30 text-amber-300' : 'text-slate-400 hover:text-amber-300'
                  }`}
                >
                  {f === 'all' ? 'Todos' : f === 'shift' ? 'Plantão' : 'Folga'}
                </button>
              ))}
            </div>
            <ShiftSchedulePDFExport agentId={agentId} />
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} aria-label="Mês anterior">
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-[11px] font-medium min-w-[86px] text-center capitalize tabular-nums">
                {format(currentMonth, "MMM yyyy", { locale: ptBR })}
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} aria-label="Próximo mês">
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>


      <CardContent className="space-y-2 relative px-3 pb-3">
        {/* Resumo do mês: Cumpridos x Não cumpridos */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-300 leading-none tabular-nums">{doneCount}</p>
              <p className="text-[9px] text-emerald-200/70 uppercase tracking-wide mt-0.5">Cumpridos</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1.5">
            <XCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-rose-300 leading-none tabular-nums">{missedCount}</p>
              <p className="text-[9px] text-rose-200/70 uppercase tracking-wide mt-0.5">Não cumpridos</p>
            </div>
          </div>
        </div>

        {/* Stats compactos */}
        <div className="grid grid-cols-4 gap-1">
          {[
            { v: shiftDays, label: 'Plantões', box: 'bg-amber-500/10 border-amber-500/25', text: 'text-amber-400' },
            { v: vacationDays, label: 'Férias', box: 'bg-purple-500/10 border-purple-500/25', text: 'text-purple-400' },
            { v: leaveDays, label: 'Folgas', box: 'bg-blue-500/10 border-blue-500/25', text: 'text-blue-400' },
            { v: `${totalBhHours > 0 ? '+' : ''}${totalBhHours}`, label: 'BH', box: 'bg-green-500/10 border-green-500/25', text: 'text-green-400' },
          ].map((s) => (
            <div key={s.label} className={`${s.box} border rounded py-1 px-1 text-center`}>
              <p className={`text-xs md:text-sm font-bold ${s.text} leading-none tabular-nums`}>{s.v}</p>
              <p className="text-[8px] text-muted-foreground uppercase mt-0.5 truncate tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>


        {/* Grid compacto do mês */}
        <div className="bg-slate-900/60 rounded-md p-1.5 border border-slate-700/50 mx-auto w-full max-w-[320px]">
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
              <div key={i} className="text-center text-[9px] text-muted-foreground font-semibold uppercase">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-7 sm:h-8" />
            ))}

            <TooltipProvider delayDuration={150}>
              {days.map((day) => {
                const dayInfo = getDayInfo(day);
                const colors = getDayColors(dayInfo.types);
                const marker = getDayMarker(dayInfo.types);
                const isTodayDay = dayInfo.types.includes('today');

                // Dados profissionais do tooltip (folga + plantão)
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayShift = shifts.find(s => s.shift_date === dateStr && !s.is_vacation);
                const prevShift = [...shifts]
                  .filter(s => s.shift_date < dateStr && !s.is_vacation)
                  .sort((a, b) => (a.shift_date < b.shift_date ? 1 : -1))[0];

                const shiftStartStr = dayShift?.start_time?.slice(0, 5);
                const shiftEndStr = dayShift?.end_time?.slice(0, 5);
                const shiftIsNight = shiftStartStr
                  ? Number(shiftStartStr.split(':')[0]) >= 19 || Number(shiftStartStr.split(':')[0]) < 7
                  : false;
                // Duração do plantão (24h padrão · 12h excepcional)
                const shiftDurationH = (() => {
                  if (!shiftStartStr || !shiftEndStr) return null;
                  const [sh, sm] = shiftStartStr.split(':').map(Number);
                  const [eh, em] = shiftEndStr.split(':').map(Number);
                  let mins = (eh * 60 + em) - (sh * 60 + sm);
                  if (mins <= 0) mins += 24 * 60;
                  return Math.round(mins / 60);
                })();
                const isExceptional12h = shiftDurationH === 12;
                const restUntil = shiftStartStr || prevShift?.end_time?.slice(0, 5);

                // Status do plantão (usa fuso local para "hoje")
                const shiftStatus = dayShift ? computeShiftStatus(day, dayShift) : null;
                const isShiftDone = shiftStatus === 'done';
                const isShiftMissed = shiftStatus === 'missed';
                const isShiftScheduled = shiftStatus === 'scheduled';

                // Classificação da folga (24h · 12h pós-plantão · 12h excepcional diurna)
                const restInfo = !dayShift ? classifyRestDay(day, shifts) : { kind: 'none' as const };

                // Cores especiais para plantão cumprido (emerald) — sobrescreve amber.
                // Folga excepcional 12h ganha tom fuchsia para bater com a legenda.
                const dayColors = isShiftDone
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : isShiftMissed
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : !dayShift && restInfo.kind === 'off_12h_exceptional'
                  ? 'bg-fuchsia-500/15 border-fuchsia-500/35 text-fuchsia-300'
                  : colors;

                const isShiftLike = dayInfo.types.includes('shift');
                const isLeaveLike = dayInfo.types.includes('leave') || dayInfo.types.includes('vacation') || (!dayShift && (restInfo.kind === 'off_24h' || restInfo.kind === 'off_12h_exceptional' || restInfo.kind === 'half_post'));
                const matchesFilter = filter === 'all' || (filter === 'shift' && isShiftLike) || (filter === 'leave' && isLeaveLike);
                const filterDimClass = matchesFilter ? '' : 'opacity-25 saturate-50';
                return (
                  <Tooltip key={day.toISOString()}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => openDay(day)}
                        aria-label={`Abrir jornada de ${format(day, "d 'de' MMMM", { locale: ptBR })}`}
                        className={`relative h-7 sm:h-8 w-full rounded border flex flex-col items-center justify-center text-[10px] font-medium transition-all cursor-pointer hover:brightness-125 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${dayColors} ${filterDimClass} ${
                          isTodayDay ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-900 shadow-lg shadow-amber-500/30' : ''
                        }`}
                      >

                        <span
                          className={`leading-none tabular-nums ${isTodayDay ? 'font-bold' : ''} ${
                            isShiftDone ? 'line-through decoration-emerald-400/70 decoration-[1.5px]' : ''
                          }`}
                        >
                          {format(day, 'd')}
                        </span>
                        {isShiftDone ? (
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" aria-hidden className="mt-0.5">
                            <path d="M5 12l5 5L20 7" stroke="hsl(142 71% 55%)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          marker
                        )}
                        {isTodayDay && (
                          <span
                            aria-hidden
                            className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)] animate-pulse"
                          />
                        )}
                        {isShiftDone && !isTodayDay && (
                          <span
                            aria-hidden
                            className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)] flex items-center justify-center"
                          >
                            <svg width="6" height="6" viewBox="0 0 24 24" fill="none">
                              <path d="M5 12l5 5L20 7" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px] bg-slate-900 border-slate-700 p-2.5">
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-amber-300 pb-1 border-b border-slate-700 capitalize">
                          {format(day, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          {isTodayDay && <span className="text-[9px] text-amber-400/80">(hoje)</span>}
                        </div>

                        {/* Bloco de status do plantão — sempre visível quando há plantão */}
                        {dayShift && isShiftDone && (
                          <div className="flex items-start gap-1.5 text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-1.5 py-1">
                            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                            <span className="leading-tight">
                              <span className="font-bold uppercase tracking-wide">Plantão cumprido</span>
                              {isExceptional12h && (
                                <span className="ml-1 text-[9px] font-bold px-1 py-[1px] rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 uppercase">Excep. 12h</span>
                              )}
                              <br />
                              <span className="text-[10px] text-emerald-200/80 tabular-nums">
                                {format(day, "dd/MM/yyyy", { locale: ptBR })} · {shiftStartStr}–{shiftEndStr || '—'} ({shiftDurationH ?? '?'}h)
                              </span>
                            </span>
                          </div>
                        )}
                        {dayShift && isShiftMissed && (
                          <div className="flex items-start gap-1.5 text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded px-1.5 py-1">
                            <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                            <span className="leading-tight">
                              <span className="font-bold uppercase tracking-wide">Plantão não cumprido</span>
                              {isExceptional12h && (
                                <span className="ml-1 text-[9px] font-bold px-1 py-[1px] rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 uppercase">Excep. 12h</span>
                              )}
                              <br />
                              <span className="text-[10px] text-rose-200/80 tabular-nums">
                                {format(day, "dd/MM/yyyy", { locale: ptBR })} · {shiftStartStr}–{shiftEndStr || '—'} ({shiftDurationH ?? '?'}h)
                              </span>
                            </span>
                          </div>
                        )}
                        {dayShift && isShiftScheduled && (
                          <div className={`flex items-start gap-1.5 rounded px-1.5 py-1 border ${shiftIsNight ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30' : 'text-sky-300 bg-sky-500/10 border-sky-500/30'}`}>
                            {shiftIsNight
                              ? <Moon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                              : <Sun className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />}
                            <span className="leading-tight">
                              <span className="font-bold uppercase tracking-wide">
                                Plantão agendado ({shiftIsNight ? 'noturno' : 'diurno'})
                              </span>
                              {isExceptional12h && (
                                <span className="ml-1 text-[9px] font-bold px-1 py-[1px] rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 uppercase">Excep. 12h</span>
                              )}
                              <br />
                              <span className="text-[10px] opacity-80 tabular-nums">
                                {format(day, "dd/MM/yyyy", { locale: ptBR })} · {shiftStartStr}–{shiftEndStr || '—'} ({shiftDurationH ?? '?'}h)
                              </span>
                            </span>
                          </div>
                        )}

                        {!dayShift && dayInfo.types.includes('leave') && (
                          <div className="flex items-start gap-1.5 text-blue-300">
                            <Palmtree className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span className="leading-tight font-semibold">Folga aprovada</span>
                          </div>
                        )}
                        {!dayShift && !dayInfo.types.includes('leave') && restInfo.kind === 'half_post' && (
                          <div className="flex items-start gap-1.5 text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 rounded px-1.5 py-1">
                            <Coffee className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                            <span className="leading-tight">
                              <span className="font-bold uppercase tracking-wide">Meia folga (12h)</span>
                              <br />
                              <span className="text-[10px] opacity-80">
                                Pós-plantão · madrugada 00:00–07:00 ainda no serviço
                              </span>
                            </span>
                          </div>
                        )}
                        {!dayShift && !dayInfo.types.includes('leave') && restInfo.kind === 'off_12h_exceptional' && (
                          <div className="flex items-start gap-1.5 text-fuchsia-300 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded px-1.5 py-1">
                            <Coffee className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                            <span className="leading-tight">
                              <span className="font-bold uppercase tracking-wide">Folga excepcional (12h)</span>
                              <br />
                              <span className="text-[10px] opacity-80 tabular-nums">
                                Janela livre {restInfo.windowLabel ?? '07:00–19:00'} · após plantão noturno 19→07
                              </span>
                            </span>
                          </div>
                        )}
                        {!dayShift && !dayInfo.types.includes('leave') && restInfo.kind === 'off_24h' && (
                          <div className="flex items-start gap-1.5 text-sky-300 bg-sky-500/10 border border-sky-500/30 rounded px-1.5 py-1">
                            <Palmtree className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                            <span className="leading-tight">
                              <span className="font-bold uppercase tracking-wide">Folga integral (24h)</span>
                              <br />
                              <span className="text-[10px] opacity-80">Dia inteiramente livre entre plantões</span>
                            </span>
                          </div>
                        )}
                        {!dayShift && !dayInfo.types.includes('leave') && restInfo.kind === 'none' && (
                          <div className="flex items-start gap-1.5 text-muted-foreground">
                            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span className="leading-tight">Sem plantão cadastrado</span>
                          </div>
                        )}

                        <div className="text-[9px] text-muted-foreground pt-1 border-t border-slate-700/60 italic">
                          {dayShift ? 'Clique para ver detalhes do plantão' : 'Clique para ver a jornada completa'}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
        </div>

        {/* Legenda com dots SVG — sempre visível */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 pt-1 border-t border-slate-700/50">
          {[
            { c: 'hsl(43 96% 56%)', label: 'Plantão' },
            { c: 'hsl(142 71% 45%)', label: 'Cumprido ✓' },
            { c: 'hsl(0 84% 60%)', label: 'Não cumprido ✕' },
            { c: 'hsl(199 89% 60%)', label: 'Folga 24h' },
            { c: 'hsl(239 84% 67%)', label: 'Meia folga 12h' },
            { c: 'hsl(270 91% 65%)', label: 'Férias' },
            { c: 'hsl(217 91% 60%)', label: 'Folga aprovada' },
            { c: 'hsl(292 84% 61%)', label: 'Excepcional 12h · plantão 19→07 · folga 07→19' },
          ].map((it) => (
            <div key={it.label} className="flex items-center gap-1">
              <svg width="6" height="6" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill={it.c} /></svg>
              <span className="text-[9px] text-muted-foreground whitespace-nowrap">{it.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
      <JourneyDetailsDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        data={detailData}
        onRequestDate={fetchJourneyForDate}
        storageKey={`journey:last-date:${agentId}`}
      />

      {/* Modal de detalhes do plantão (horário, status, observações) */}
      <Dialog open={shiftModalOpen} onOpenChange={setShiftModalOpen}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-slate-100">
          {shiftModalData && (() => {
            const { date, shift, status, startStr, endStr } = shiftModalData;
            const statusMeta =
              status === 'done'
                ? { icon: CheckCircle2, label: 'PLANTÃO CUMPRIDO', color: 'emerald', bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' }
                : status === 'missed'
                ? { icon: XCircle, label: 'PLANTÃO NÃO CUMPRIDO', color: 'rose', bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300' }
                : { icon: Clock, label: 'PLANTÃO AGENDADO', color: 'sky', bg: 'bg-sky-500/10 border-sky-500/30 text-sky-300' };
            const StatusIcon = statusMeta.icon;
            const nightShift = Number(startStr.split(':')[0]) >= 19 || Number(startStr.split(':')[0]) < 7;
            const modalDurationH = (() => {
              const [sh, sm] = startStr.split(':').map(Number);
              const [eh, em] = endStr.split(':').map(Number);
              if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
              let mins = (eh * 60 + em) - (sh * 60 + sm);
              if (mins <= 0) mins += 24 * 60;
              return Math.round(mins / 60);
            })();
            const modalIsExceptional = modalDurationH === 12;

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 capitalize text-amber-300">
                    {nightShift ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs">
                    Detalhes do plantão registrado para este dia.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 pt-1">
                  {/* Status destacado */}
                  <div className={`flex items-center gap-2 rounded-md border px-3 py-2 ${statusMeta.bg}`}>
                    <StatusIcon className="h-5 w-5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm tracking-wide flex items-center gap-1.5 flex-wrap">
                        {statusMeta.label}
                        {modalIsExceptional && (
                          <span className="text-[9px] font-bold px-1.5 py-[1px] rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 uppercase tracking-wider">
                            Excepcional 12h
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] opacity-80 tabular-nums">
                        {format(date, "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  {/* Horário */}
                  <div className="rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Horário
                    </p>
                    <p className="text-lg font-bold tabular-nums text-slate-100 mt-0.5">
                      {startStr} <span className="text-slate-500">→</span> {endStr}
                      {modalDurationH !== null && (
                        <span className="ml-2 text-xs font-semibold text-slate-400">({modalDurationH}h)</span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Turno {nightShift ? 'noturno' : 'diurno'}
                      {modalIsExceptional
                        ? ` · escala excepcional de 12h (${nightShift ? '19→07' : '07→19'})`
                        : ' · escala padrão 24h'}
                      {' · '}{shift.shift_date}
                    </p>
                  </div>


                  {/* Observações */}
                  <div className="rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Observações
                    </p>
                    <p className="text-xs text-slate-200 mt-1 whitespace-pre-wrap">
                      {shift.notes && shift.notes.trim().length > 0
                        ? shift.notes
                        : <span className="text-slate-500 italic">Nenhuma observação registrada.</span>}
                    </p>
                  </div>
                </div>

                <DialogFooter className="flex-row justify-between gap-2 sm:justify-between flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-200 hover:bg-slate-800"
                    onClick={() => {
                      setShiftModalOpen(false);
                      setDetailData(buildJourneyFromShifts(date, shifts));
                      setDetailOpen(true);
                    }}
                  >
                    Ver jornada completa
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                      onClick={() => {
                        setShiftModalOpen(false);
                        document.body.style.pointerEvents = '';
                        window.setTimeout(() => {
                          setEditData({ date, shift: shift as ShiftEditRecord });
                          setEditOpen(true);
                        }, 80);
                      }}
                    >
                      Editar plantão
                    </Button>
                    <Button
                      size="sm"
                      className="bg-amber-500 text-black hover:bg-amber-400"
                      onClick={() => setShiftModalOpen(false)}
                    >
                      Fechar
                    </Button>
                  </div>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {editData && (
        <ShiftEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          shiftDate={editData.date}
          shift={editData.shift}
          agentId={agentId}
          onSaved={() => {
            fetchData();
            checkDivergences();
          }}
        />
      )}
    </Card>
  );
}

