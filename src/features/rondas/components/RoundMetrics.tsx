import { CheckCircle2, Clock3, AlertTriangle, ShieldAlert, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PatrolMetrics } from '../types';

interface Kpi {
  label: string;
  value: string;
  suffix?: string;
  /** 0–100; alimenta a barra de progresso do card. */
  pct: number;
  icon: typeof CheckCircle2;
  ring: string;
  text: string;
  bar: string;
  chip: string;
}

/**
 * Faixa de indicadores do turno — um card por métrica, com ícone em
 * destaque, número grande e barra de progresso, no padrão do painel
 * operacional (Concluídas · Pendentes · Atrasos · Ocorrências · Cobertura).
 */
export function RoundMetrics({ metrics }: { metrics: PatrolMetrics }) {
  const total = Math.max(metrics.total_slots, 1);
  const pct = (n: number) => Math.round((n / total) * 100);

  const items: Kpi[] = [
    {
      label: 'Rondas Concluídas',
      value: String(metrics.completed_slots),
      suffix: `de ${metrics.total_slots}`,
      pct: pct(metrics.completed_slots),
      icon: CheckCircle2,
      ring: 'ring-emerald-500/25',
      text: 'text-emerald-400',
      bar: 'bg-emerald-500',
      chip: 'bg-emerald-500/15',
    },
    {
      label: 'Pendentes',
      value: String(metrics.pending_slots),
      pct: pct(metrics.pending_slots),
      icon: Clock3,
      ring: 'ring-sky-500/25',
      text: 'text-sky-400',
      bar: 'bg-sky-500',
      chip: 'bg-sky-500/15',
    },
    {
      label: 'Atrasos',
      value: String(metrics.late_slots),
      pct: pct(metrics.late_slots),
      icon: AlertTriangle,
      ring: 'ring-amber-500/25',
      text: 'text-amber-400',
      bar: 'bg-amber-500',
      chip: 'bg-amber-500/15',
    },
    {
      label: 'Ocorrências',
      value: String(metrics.open_incidents),
      pct: pct(metrics.open_incidents),
      icon: ShieldAlert,
      ring: 'ring-rose-500/25',
      text: 'text-rose-400',
      bar: 'bg-rose-500',
      chip: 'bg-rose-500/15',
    },
    {
      label: 'Cobertura do Turno',
      value: `${metrics.coverage_pct}%`,
      pct: metrics.coverage_pct,
      icon: Target,
      ring: 'ring-primary/25',
      text: 'text-primary',
      bar: 'bg-primary',
      chip: 'bg-primary/15',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-xl border border-border bg-card p-3 ring-1 ring-inset ring-transparent transition-colors hover:border-border/80"
        >
          <div className="flex items-start gap-2.5">
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1', it.chip, it.ring)}>
              <it.icon className={cn('h-4 w-4', it.text)} strokeWidth={2.3} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium leading-tight text-muted-foreground">{it.label}</p>
              <p className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold leading-none tabular-nums text-foreground">{it.value}</span>
                {it.suffix && <span className="text-[11px] text-muted-foreground">{it.suffix}</span>}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-[width] duration-500', it.bar)}
                style={{ width: `${Math.min(100, Math.max(0, it.pct))}%` }}
              />
            </div>
            <span className="shrink-0 text-[10px] font-semibold tabular-nums text-muted-foreground">{it.pct}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
