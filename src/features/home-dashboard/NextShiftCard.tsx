import { useMemo } from 'react';
import { Calendar, MapPin, Users, ArrowRight, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useServerTime } from '@/hooks/useServerTime';
import type { NextShift } from './useHomeDashboardData';

function fmtCountdown(ms: number): string {
  if (ms <= 0) return '00min';
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m}min`;
}

export function NextShiftCard({
  shift, unitName, team,
}: { shift: NextShift | null | undefined; unitName: string | null; team: string | null }) {
  const navigate = useNavigate();
  const now = useServerTime(30_000);

  const { startsInMs, isToday, isNight } = useMemo(() => {
    if (!shift) return { startsInMs: 0, isToday: false, isNight: false };
    const start = new Date(`${shift.shift_date}T${shift.start_time}`);
    const today = new Date().toISOString().slice(0, 10);
    const startHour = Number(shift.start_time.slice(0, 2));
    return {
      startsInMs: start.getTime() - now.getTime(),
      isToday: shift.shift_date === today,
      isNight: startHour >= 18 || startHour < 6,
    };
  }, [shift, now]);

  const progressPct = shift ? Math.min(100, Math.max(0, 100 - (startsInMs / (24 * 3_600_000)) * 100)) : 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progressPct / 100);

  if (!shift) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center">
        <Calendar className="h-8 w-8 text-muted-foreground" strokeWidth={1.8} />
        <p className="mt-2 text-sm text-muted-foreground">Nenhum plantão agendado nos próximos dias.</p>
      </div>
    );
  }

  const PeriodIcon = isNight ? Moon : Sun;

  return (
    <div className="flex h-full flex-col rounded-2xl bg-[linear-gradient(135deg,hsl(222_47%_14%)_0%,hsl(222_47%_10%)_100%)] p-5 text-white">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/60">Próximo plantão</span>
        {isToday && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">Hoje</span>
        )}
      </div>

      <div className="flex flex-1 flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <PeriodIcon className="h-4 w-4 text-white/80" />
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums sm:text-3xl">{shift.start_time.slice(0, 5)}</span>
              <ArrowRight className="h-4 w-4 text-white/40" />
              <span className="text-2xl font-bold tabular-nums sm:text-3xl">{shift.end_time.slice(0, 5)}</span>
            </div>
          </div>
          <p className="mt-1 text-sm text-white/60">{isNight ? 'Plantão Noturno' : 'Plantão Diurno'}</p>

          <div className="mt-4 flex flex-wrap gap-4">
            {unitName && (
              <div className="flex items-center gap-1.5 text-sm">
                <MapPin className="h-3.5 w-3.5 text-white/50" />
                Unidade <span className="font-medium">{unitName}</span>
              </div>
            )}
            {team && (
              <div className="flex items-center gap-1.5 text-sm">
                <Users className="h-3.5 w-3.5 text-white/50" />
                Equipe <span className="font-medium">{team}</span>
              </div>
            )}
          </div>
        </div>

        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center sm:h-24 sm:w-24">
          <svg width="100%" height="100%" viewBox="0 0 84 84" className="-rotate-90">
            <circle cx={42} cy={42} r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={6} />
            <circle
              cx={42} cy={42} r={radius} fill="none" stroke="hsl(var(--primary))" strokeWidth={6}
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[9px] font-semibold uppercase text-white/50">Começa em</span>
            <span className="text-sm font-bold tabular-nums">{fmtCountdown(startsInMs)}</span>
          </div>
        </div>
      </div>

      <Button className="mt-5 w-full gap-1.5" onClick={() => navigate('/agenda')}>
        Ver detalhes <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
