import { Calendar, CalendarDays, ArrowLeftRight, Bell } from 'lucide-react';

export function HomeKpiRow({ counts }: { counts: { today: number; upcoming: number; swaps: number; notices: number } }) {
  const items = [
    { label: 'Hoje', value: counts.today, unit: counts.today === 1 ? 'plantão' : 'plantões', icon: Calendar, tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { label: 'Próximos', value: counts.upcoming, unit: counts.upcoming === 1 ? 'plantão' : 'plantões', icon: CalendarDays, tone: 'bg-primary/10 text-primary' },
    { label: 'Trocas', value: counts.swaps, unit: 'pendentes', icon: ArrowLeftRight, tone: 'bg-warning/10 text-warning' },
    { label: 'Avisos', value: counts.notices, unit: counts.notices === 1 ? 'novo' : 'novos', icon: Bell, tone: 'bg-destructive/10 text-destructive' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className={`rounded-xl p-3.5 ${it.tone}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide opacity-80">{it.label}</span>
            <it.icon className="h-4 w-4 opacity-70" strokeWidth={2.2} />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums">{it.value}</span>
            <span className="text-xs opacity-70">{it.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
