import { formatClock, type RoundTimerState } from '../useRoundTimer';
import { cn } from '@/lib/utils';

interface RoundTimerProps {
  timer: RoundTimerState;
  size?: number;
}

/** Timer circular SVG — sem biblioteca externa. Cor muda por urgência, mas o
 * texto/label sempre acompanha (não depende só de cor, ver Seção 27/49). */
export function RoundTimer({ timer, size = 220 }: RoundTimerProps) {
  const { secondsRemaining, totalSeconds, progressPct, isPaused, isLate } = timer;
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progressPct / 100);

  const pctRemaining = totalSeconds > 0 ? secondsRemaining / totalSeconds : 0;
  const tone = isLate || pctRemaining <= 0
    ? 'danger'
    : pctRemaining <= 0.15
    ? 'warning'
    : 'normal';

  const strokeColor = tone === 'danger' ? 'hsl(var(--destructive))' : tone === 'warning' ? 'hsl(var(--warning))' : 'hsl(var(--primary))';
  const label = isPaused ? 'PAUSADO' : tone === 'danger' ? 'ATRASADO' : 'TEMPO RESTANTE';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={10} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span
          className={cn(
            'text-[11px] font-semibold uppercase tracking-wide',
            tone === 'danger' ? 'text-destructive' : tone === 'warning' ? 'text-warning' : 'text-muted-foreground',
          )}
        >
          {label}
        </span>
        <span className="text-4xl font-bold tabular-nums text-foreground">{formatClock(secondsRemaining)}</span>
        <span className="text-xs text-muted-foreground">de {formatClock(totalSeconds)}</span>
      </div>
    </div>
  );
}
