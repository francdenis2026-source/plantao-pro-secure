import { useMemo, useState } from 'react';
import { MapPin, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { NextShift } from './useHomeDashboardData';

const DOW = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function WeekStrip({
  shifts, unitName, team, isLoading,
}: { shifts: NextShift[]; unitName?: string | null; team?: string | null; isLoading?: boolean }) {
  const days = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  const shiftByDate = useMemo(() => {
    const map = new Map<string, NextShift>();
    shifts.forEach((s) => map.set(s.shift_date, s));
    return map;
  }, [shifts]);

  const [selected, setSelected] = useState<string>(toDateStr(days[0]));
  const selectedShift = shiftByDate.get(selected);
  const selectedDate = days.find((d) => toDateStr(d) === selected) ?? days[0];
  const isSelectedToday = toDateStr(selectedDate) === toDateStr(new Date());

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <Skeleton className="mt-3 h-16 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Minha semana</h3>
        {/* Só a semana atual é carregada por enquanto — sem paginação real,
            então não mostramos setas de navegação que não fariam nada. */}
        <span className="text-xs text-muted-foreground">{MONTHS[days[0].getMonth()]} {days[0].getFullYear()}</span>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const dateStr = toDateStr(d);
          const hasShift = shiftByDate.has(dateStr);
          const isSelected = dateStr === selected;
          return (
            <button
              key={dateStr}
              onClick={() => setSelected(dateStr)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg py-2 text-xs transition-colors',
                isSelected ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <span className="font-medium">{DOW[d.getDay()]}</span>
              <span className="text-sm font-bold tabular-nums">{String(d.getDate()).padStart(2, '0')}</span>
              <span className={cn('h-1.5 w-1.5 rounded-full', hasShift ? (isSelected ? 'bg-primary-foreground' : 'bg-primary') : 'bg-transparent')} />
            </button>
          );
        })}
      </div>

      {selectedShift ? (
        <div className="mt-3 rounded-lg bg-muted/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground capitalize">
              {isSelectedToday ? 'Hoje' : selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </span>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">Ver detalhes</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground">
            <span className="font-semibold tabular-nums">{selectedShift.start_time.slice(0, 5)} – {selectedShift.end_time.slice(0, 5)}</span>
            <span className="text-xs text-muted-foreground capitalize">{selectedShift.shift_type === 'regular' ? 'Plantão' : selectedShift.shift_type}</span>
            {unitName && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> Unidade {unitName}</span>
            )}
            {team && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" /> Equipe {team}</span>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-center text-xs text-muted-foreground">Sem plantão neste dia</p>
      )}
    </div>
  );
}
