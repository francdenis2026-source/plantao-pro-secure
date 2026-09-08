import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Palmtree, History, AlertCircle, Eye } from 'lucide-react';
import { format, parseISO, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { JourneyDetailsDialog, type JourneyDetailsData } from './JourneyDetailsDialog';

interface RecentShiftCyclesCardProps {
  agentId: string;
  className?: string;
}

interface ShiftRow {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string | null;
}

interface Cycle {
  id: string;
  shiftStart: Date;
  shiftEnd: Date;
  restStart: Date | null;
  restEnd: Date;
  durationH: number;
  restH: number | null;
  isNight: boolean;
}

const buildDateTime = (dateStr: string, time: string | null, fallback: string): Date => {
  const [h, m] = (time || fallback).split(':').map(Number);
  const d = parseISO(dateStr);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};

export function RecentShiftCyclesCard({ agentId, className }: RecentShiftCyclesCardProps) {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<JourneyDetailsData | null>(null);

  const openDetails = (c: Cycle) => {
    setDetailData({
      targetDate: c.shiftStart,
      restStart: c.restStart,
      restEnd: c.restStart ? c.restEnd : null,
      shiftStart: c.shiftStart,
      shiftEnd: c.shiftEnd,
    });
    setDetailOpen(true);
  };

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!agentId) return;
      setIsLoading(true);
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        // Busca os 4 últimos plantões passados; usa gap com o anterior para inferir descanso
        const { data } = await supabase
          .from('agent_shifts')
          .select('id, shift_date, start_time, end_time')
          .eq('agent_id', agentId)
          .lt('shift_date', today)
          .eq('is_vacation', false)
          .order('shift_date', { ascending: false })
          .limit(4);

        if (!alive) return;
        const rows = (data || []) as ShiftRow[];
        // Ordena cronologicamente pra calcular descanso (rest = fim do anterior → início do atual)
        const asc = [...rows].reverse();
        const built: Cycle[] = asc.map((row, idx) => {
          const shiftStart = buildDateTime(row.shift_date, row.start_time, '07:00');
          const shiftEnd = buildDateTime(row.shift_date, row.end_time, '19:00');
          if (shiftEnd <= shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1);
          const durationH = Math.max(0, Math.round((shiftEnd.getTime() - shiftStart.getTime()) / 3_600_000));
          const isNight = shiftStart.getHours() >= 19 || shiftStart.getHours() < 7;

          let restStart: Date | null = null;
          let restH: number | null = null;
          if (idx > 0) {
            const prev = asc[idx - 1];
            const prevStart = buildDateTime(prev.shift_date, prev.start_time, '07:00');
            const prevEnd = buildDateTime(prev.shift_date, prev.end_time, '19:00');
            if (prevEnd <= prevStart) prevEnd.setDate(prevEnd.getDate() + 1);
            restStart = prevEnd;
            restH = Math.max(0, differenceInHours(shiftStart, prevEnd));
          }

          return {
            id: row.id,
            shiftStart,
            shiftEnd,
            restStart,
            restEnd: shiftStart,
            durationH,
            restH,
            isNight,
          };
        });
        // Pega os 3 mais recentes na ordem descendente
        setCycles(built.reverse().slice(0, 3));
      } catch (err) {
        console.error('Error loading recent shift cycles:', err);
      } finally {
        if (alive) setIsLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [agentId]);

  return (
    <Card className={cn('bg-slate-800/50 border-slate-700', className)}>
      <CardHeader className="pb-1.5 pt-2.5 px-3">
        <CardTitle className="flex items-center gap-1.5 text-xs md:text-sm">
          <History className="h-3.5 w-3.5 text-amber-400" />
          <span>Últimos Plantões</span>
          <span className="ml-auto text-[10px] font-normal text-muted-foreground">últimos 3 ciclos</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-1.5">
        {isLoading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        ) : cycles.length === 0 ? (
          <div className="flex items-start gap-2 rounded-md border border-slate-700/60 bg-slate-900/40 p-2.5">
            <AlertCircle className="h-4 w-4 mt-0.5 text-amber-400 flex-shrink-0" />
            <div className="text-[11px] leading-snug text-muted-foreground">
              Ainda não há plantões anteriores registrados. Revise o cadastro do agente
              (data do primeiro plantão) para começar a exibir o histórico de ciclos.
            </div>
          </div>
        ) : (
          cycles.map((c) => {
            const PeriodIcon = c.isNight ? Moon : Sun;
            const periodLabel = c.isNight ? 'Noturno' : 'Diurno';
            const restStr = c.restStart && c.restH !== null
              ? `${format(c.restStart, 'dd/MM HH:mm')} → ${format(c.restEnd, 'dd/MM HH:mm')} (${c.restH}h)`
              : 'sem ciclo anterior no histórico';
            return (
              <div
                key={c.id}
                className={cn(
                  'relative rounded-md border p-2 space-y-1 overflow-hidden',
                  c.isNight
                    ? 'border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-slate-800/40 to-slate-900/60'
                    : 'border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-slate-800/40 to-slate-900/60'
                )}
              >
                {/* Diagonal "CUMPRIDO" stamp */}
                <div className="pointer-events-none absolute -right-8 top-2 rotate-12 select-none">
                  <div className="px-6 py-0.5 border-2 border-emerald-400/60 rounded-sm bg-emerald-500/10 text-emerald-300/90 text-[9px] font-black tracking-[0.2em] uppercase shadow-inner">
                    ✓ Cumprido
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <PeriodIcon className={cn('h-3.5 w-3.5', c.isNight ? 'text-indigo-300' : 'text-amber-300')} />
                  <span className={cn('text-[11px] font-bold uppercase tracking-wide line-through decoration-emerald-500/50 decoration-[1.5px]', c.isNight ? 'text-indigo-300/80' : 'text-sky-300/80')}>
                    Plantão {c.durationH}h {periodLabel}
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                    {format(c.shiftStart, 'EEE dd/MM', { locale: ptBR })}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-0.5 text-[10.5px] leading-snug">
                  <div className="flex items-center gap-1 text-emerald-300/90">
                    <Palmtree className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      <span className="font-semibold">Descanso:</span> {restStr}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-300">
                    <PeriodIcon className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate line-through decoration-emerald-500/40">
                      <span className="font-semibold">Plantão:</span> {format(c.shiftStart, 'HH:mm')}–{format(c.shiftEnd, 'HH:mm')}
                      {' • '}{c.durationH}h {periodLabel.toLowerCase()}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDetails(c)}
                    className="h-6 px-2 text-[10px] text-amber-300 hover:text-amber-200 hover:bg-amber-500/10"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver detalhes
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
      <JourneyDetailsDialog open={detailOpen} onOpenChange={setDetailOpen} data={detailData} />
    </Card>
  );
}
