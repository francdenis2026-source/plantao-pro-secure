import { cn } from '@/lib/utils';

interface SignalUplinkProps {
  className?: string;
  label?: string;
}

/**
 * Medidor de uplink tático — barras animadas de sinal + label "UPLINK".
 * Substitui o segundo radar por um indicador profissional de qualidade de enlace.
 */
export function SignalUplink({ className, label = 'UPLINK' }: SignalUplinkProps) {
  const bars = [8, 12, 16, 20, 24];
  return (
    <div
      className={cn(
        'hidden sm:flex items-center gap-2 rounded-md bg-card/60 px-2.5 py-1 ring-1 ring-border/60',
        className,
      )}
      aria-label="Qualidade do enlace de comunicação"
    >
      <div className="flex items-end gap-[2px] h-5" aria-hidden>
        {bars.map((h, i) => (
          <span
            key={i}
            className="w-[3px] rounded-sm bg-primary/80"
            style={{
              height: `${h}px`,
              animation: `uplinkPulse 1.6s ease-in-out ${i * 0.15}s infinite`,
              opacity: 0.55 + i * 0.09,
            }}
          />
        ))}
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/95 font-mono">
          {label}
        </span>
        <span className="text-[8px] uppercase tracking-[0.22em] text-muted-foreground font-mono">
          256-bit · aes
        </span>
      </div>
      <style>{`
        @keyframes uplinkPulse {
          0%, 100% { transform: scaleY(0.55); opacity: 0.5; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
