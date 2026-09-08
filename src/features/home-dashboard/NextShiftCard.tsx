import { useMemo } from 'react';
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react';
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

  const { label, startsInMs, isToday } = useMemo(() => {
    if (!shift) return { label: null, startsInMs: 0, isToday: false };
    const start = new Date(`${shift.shift_date}T${shift.start_time}`);
    const today = new Date().toISOString().slice(0, 10);
    return { label: shift, startsInMs: start.getTime() - now.getTime(), isToday: shift.shift_date === today };
  }, [shift, now]);

  const progressPct = shift ? Math.min(100, Math.max(0, 100 - (startsInMs / (24 * 3_600_000)) * 100)) : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progressPct / 100);

  if (!shift) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center">
        <Calendar className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.8} />
        <p className="mt-2 text-sm text-muted-foreground">Nenhum plantão agendado nos próximos dias.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" strokeWidth={2.2} />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Próximo plantão</span>
        {isToday && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">Hoje</span>
        )}
      </div>

      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-foreground">{shift.start_time.slice(0, 5)}</span>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <span className="text-3xl font-bold tabular-nums text-foreground">{shift.end_time.slice(0, 5)}</span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground capitalize">{shift.shift_type === 'regular' ? 'Plantão' : shift.shift_type}</p>

          <div className="mt-4 flex flex-wrap gap-4">
            {unitName && (
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {unitName}
              </div>
            )}
            {team && (
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                Equipe {team}
              </div>
            )}
          </div>
        </div>

        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
          <svg width={96} height={96} viewBox="0 0 96 96" className="-rotate-90">
            <circle cx={48} cy={48} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={7} />
            <circle
              cx={48} cy={48} r={radius} fill="none" stroke="hsl(var(--primary))" strokeWidth={7}
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[9px] font-semibold uppercase text-muted-foreground">Começa em</span>
            <span className="text-sm font-bold tabular-nums text-foreground">{fmtCountdown(startsInMs)}</span>
          </div>
        </div>
      </div>

      <Button className="mt-4 w-full gap-1.5" onClick={() => navigate('/agenda')}>
        Ver detalhes <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
