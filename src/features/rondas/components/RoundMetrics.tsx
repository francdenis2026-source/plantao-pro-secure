import { CheckCircle2, Clock3, AlertTriangle, ShieldAlert, Gauge } from 'lucide-react';
import type { PatrolMetrics } from '../types';

export function RoundMetrics({ metrics }: { metrics: PatrolMetrics }) {
  const items = [
    { label: 'Concluídas', value: `${metrics.completed_slots} de ${metrics.total_slots}`, icon: CheckCircle2, tone: 'text-success' },
    { label: 'Pendentes', value: String(metrics.pending_slots), icon: Clock3, tone: 'text-primary' },
    { label: 'Atrasos', value: String(metrics.late_slots), icon: AlertTriangle, tone: 'text-warning' },
    { label: 'Ocorrências', value: String(metrics.open_incidents), icon: ShieldAlert, tone: 'text-destructive' },
    { label: 'Cobertura', value: `${metrics.coverage_pct}%`, icon: Gauge, tone: 'text-primary' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <it.icon className={`h-3.5 w-3.5 ${it.tone}`} strokeWidth={2.2} />
            {it.label}
          </div>
          <div className="mt-1 text-xl font-bold tabular-nums text-foreground">{it.value}</div>
        </div>
      ))}
    </div>
  );
}
