import { cn } from '@/lib/utils';

/**
 * Radar tático com varredura circular animada.
 * SVG puro + CSS keyframes (sem libs). Escala pela prop `size`.
 */
export function RadarSweep({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity="0.35" />
            <stop offset="70%" stopColor="hsl(var(--success))" stopOpacity="0.08" />
            <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="radar-sweep" x1="50%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Fundo */}
        <circle cx="50" cy="50" r="48" fill="url(#radar-glow)" />
        {/* Anéis */}
        <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--success))" strokeOpacity="0.35" strokeWidth="1" />
        <circle cx="50" cy="50" r="32" fill="none" stroke="hsl(var(--success))" strokeOpacity="0.25" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="18" fill="none" stroke="hsl(var(--success))" strokeOpacity="0.2" strokeWidth="0.8" />
        {/* Cruz */}
        <line x1="4" y1="50" x2="96" y2="50" stroke="hsl(var(--success))" strokeOpacity="0.18" strokeWidth="0.6" />
        <line x1="50" y1="4" x2="50" y2="96" stroke="hsl(var(--success))" strokeOpacity="0.18" strokeWidth="0.6" />

        {/* Varredura */}
        <g style={{ transformOrigin: '50px 50px', animation: 'radar-spin 2.4s linear infinite' }}>
          <path d="M50 50 L98 50 A48 48 0 0 0 74 8 Z" fill="url(#radar-sweep)" />
        </g>

        {/* Blip */}
        <circle
          cx="68"
          cy="34"
          r="1.6"
          fill="hsl(var(--success))"
          style={{ animation: 'radar-blip 2.4s ease-out infinite' }}
        />

        {/* Centro */}
        <circle cx="50" cy="50" r="2" fill="hsl(var(--success))" />
      </svg>

      <style>{`
        @keyframes radar-spin { to { transform: rotate(360deg); } }
        @keyframes radar-blip {
          0%, 60% { opacity: 0; r: 1.6; }
          65% { opacity: 1; r: 2.4; }
          100% { opacity: 0; r: 4; }
        }
      `}</style>
    </div>
  );
}
