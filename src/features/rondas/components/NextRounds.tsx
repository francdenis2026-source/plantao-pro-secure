import { useState } from 'react';
import { ChevronRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PatrolSlot } from '../types';

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Rio_Branco' });
}

export function NextRounds({ slots }: { slots: PatrolSlot[] }) {
  const [showAll, setShowAll] = useState(false);
  const upcoming = slots.filter((s) => s.status === 'pending' || s.status === 'late');
  const visible = showAll ? upcoming : upcoming.slice(0, 5);

  if (upcoming.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma ronda pendente.</p>;
  }

  return (
    <div className="space-y-1">
      {visible.map((slot) => (
        <div key={slot.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
          <span className="w-12 shrink-0 text-sm font-bold tabular-nums text-foreground">{fmtTime(slot.scheduled_start)}</span>
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{slot.sector?.name ?? 'Setor não definido'}</span>
          <span className="shrink-0 truncate text-xs text-muted-foreground">{slot.agent?.name ?? '—'}</span>
          {slot.status === 'late' && (
            <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-warning">Atraso</span>
          )}
        </div>
      ))}
      {upcoming.length > 5 && !showAll && (
        <Button variant="ghost" size="sm" onClick={() => setShowAll(true)} className="w-full gap-1 text-muted-foreground">
          Ver todas ({upcoming.length}) <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
