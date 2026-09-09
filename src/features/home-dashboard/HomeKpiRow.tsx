import { Calendar, CalendarDays, ArrowLeftRight, Bell } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function HomeKpiRow({
  counts, isLoading,
}: { counts: { today: number; upcoming: number; swaps: number; notices: number }; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/60 p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-7 w-7 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: 'Hoje', value: counts.today, unit: counts.today === 1 ? 'plantão' : 'plantões', icon: Calendar,
      bg: 'bg-emerald-50 dark:bg-emerald-500/10', fg: 'text-emerald-700 dark:text-emerald-400', iconBg: 'bg-emerald-500/15',
    },
    {
      label: 'Próximos', value: counts.upcoming, unit: counts.upcoming === 1 ? 'plantão' : 'plantões', icon: CalendarDays,
      bg: 'bg-sky-50 dark:bg-sky-500/10', fg: 'text-sky-700 dark:text-sky-400', iconBg: 'bg-sky-500/15',
    },
    {
      label: 'Trocas', value: counts.swaps, unit: 'pendentes', icon: ArrowLeftRight,
      bg: 'bg-orange-50 dark:bg-orange-500/10', fg: 'text-orange-700 dark:text-orange-400', iconBg: 'bg-orange-500/15',
    },
    {
      label: 'Avisos', value: counts.notices, unit: counts.notices === 1 ? 'novo' : 'novos', icon: Bell,
      bg: 'bg-rose-50 dark:bg-rose-500/10', fg: 'text-rose-700 dark:text-rose-400', iconBg: 'bg-rose-500/15',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className={`rounded-xl p-4 ${it.bg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${it.fg}`}>{it.label}</span>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${it.iconBg}`}>
              <it.icon className={`h-3.5 w-3.5 ${it.fg}`} strokeWidth={2.4} />
            </span>
          </div>
          <div className={`mt-2 flex items-baseline gap-1.5 ${it.fg}`}>
            <span className="text-2xl font-bold tabular-nums">{it.value}</span>
            <span className="text-xs opacity-80">{it.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
