import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { NextShift } from './useHomeDashboardData';

const DOW = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function WeekStrip({ shifts }: { shifts: NextShift[] }) {
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

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Minha semana</h3>
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
        <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="text-foreground">{selectedShift.start_time.slice(0, 5)} – {selectedShift.end_time.slice(0, 5)}</span>
          <span className="text-xs text-muted-foreground capitalize">{selectedShift.shift_type === 'regular' ? 'Plantão' : selectedShift.shift_type}</span>
        </div>
      ) : (
        <p className="mt-3 text-center text-xs text-muted-foreground">Sem plantão neste dia</p>
      )}
    </div>
  );
}
