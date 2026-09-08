import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { PatrolSlot } from '../types';

const STATUS_STYLE: Record<PatrolSlot['status'], { bg: string; label: string }> = {
  completed: { bg: 'bg-success', label: 'Concluída' },
  active: { bg: 'bg-primary', label: 'Em andamento' },
  pending: { bg: 'bg-muted-foreground/40', label: 'Pendente' },
  late: { bg: 'bg-warning', label: 'Atraso' },
  incident: { bg: 'bg-destructive', label: 'Ocorrência' },
  cancelled: { bg: 'bg-muted-foreground/20', label: 'Cancelada' },
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Rio_Branco' });
}

/** Linha do tempo horizontal dos quartos de hora. Scroll horizontal é LOCAL
 * a este componente (overflow-x-auto), nunca da página inteira. */
export function RoundTimeline({ slots, activeSlotId }: { slots: PatrolSlot[]; activeSlotId?: string | null }) {
  if (slots.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum slot gerado para este turno ainda.</p>;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-1.5">
          {slots.map((slot) => {
            const style = STATUS_STYLE[slot.status];
            const isActive = slot.id === activeSlotId;
            return (
              <Tooltip key={slot.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'flex w-16 shrink-0 flex-col items-center gap-1 rounded-md border px-1.5 py-2 text-center transition-transform',
                      isActive ? 'border-primary scale-105' : 'border-transparent',
                    )}
                  >
                    <span className={cn('h-2 w-2 rounded-full', style.bg)} aria-hidden />
                    <span className="text-[10px] font-medium tabular-nums text-muted-foreground">{fmtTime(slot.scheduled_start)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <div className="font-semibold">{fmtTime(slot.scheduled_start)} – {fmtTime(slot.scheduled_end)}</div>
                  <div>{style.label}{slot.sector?.name ? ` · ${slot.sector.name}` : ''}</div>
                  {slot.agent?.name && <div className="text-muted-foreground">{slot.agent.name}</div>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
