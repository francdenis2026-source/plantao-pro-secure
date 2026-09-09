import { Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useServerClockParts } from '@/hooks/useServerTime';

/** Relógio ao vivo (fuso Rio Branco/AC) — badge compacto com dois-pontos
 * piscando e leve brilho pulsante, para destacar a hora atual sem competir
 * visualmente com o resto do header. Usa o relógio sincronizado com o
 * servidor (Seção 41): a hora exibida não muda se o dispositivo estiver
 * com data/hora alteradas, certas ou erradas. */
export function LiveClock({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  const { hours, minutes, seconds } = useServerClockParts();
  const pad = (n: number) => String(n).padStart(2, '0');
  const [hh, mm, ss] = [pad(hours), pad(minutes), pad(seconds)];

  return (
    <div
      className={cn(
        'live-clock-badge flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.08]',
        size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1',
        className,
      )}
    >
      <Clock3 className={cn('text-primary', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} strokeWidth={2.4} />
      <span className={cn('font-mono font-bold tabular-nums text-primary', size === 'sm' ? 'text-[11px]' : 'text-[13px]')}>
        {hh}<span className="live-clock-colon">:</span>{mm}<span className="live-clock-colon">:</span>{ss}
      </span>
    </div>
  );
}
