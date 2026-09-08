interface Props {
  color: string;
  progress: number; // 0..1
  size?: number;
}

/**
 * Professional radar/pulse SVG shown next to the countdown while running.
 * - Rotating sweep arm
 * - Concentric pulse rings
 * - Progress ring bound to remaining time
 */
export function RoundsRadarSVG({ color, progress, size = 88 }: Props) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const dash = c * Math.max(0, Math.min(1, progress));

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden
      className="shrink-0 drop-shadow-[0_0_10px_rgba(0,0,0,0.35)]"
    >
      <defs>
        <radialGradient id="rr-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="70%" stopColor={color} stopOpacity="0.04" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rr-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="100%" stopColor={color} stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* Background disc */}
      <circle cx="50" cy="50" r="48" fill="url(#rr-bg)" />

      {/* Concentric guides */}
      {[14, 26, 38].map((rr) => (
        <circle key={rr} cx="50" cy="50" r={rr} fill="none" stroke={color} strokeOpacity="0.22" strokeWidth="0.6" />
      ))}
      {/* Crosshair */}
      <line x1="50" y1="6" x2="50" y2="94" stroke={color} strokeOpacity="0.18" strokeWidth="0.5" />
      <line x1="6" y1="50" x2="94" y2="50" stroke={color} strokeOpacity="0.18" strokeWidth="0.5" />

      {/* Pulse rings — cadence tied to remaining progress (faster near the end) */}
      {(() => {
        const pulseDur = Math.max(0.9, 2.6 - progress * 1.6).toFixed(2) + 's';
        return (
          <>
            <circle cx="50" cy="50" r="10" fill="none" stroke={color} strokeWidth="0.8">
              <animate attributeName="r" from="10" to="44" dur={pulseDur} repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.75" to="0" dur={pulseDur} repeatCount="indefinite" />
            </circle>
            <circle cx="50" cy="50" r="10" fill="none" stroke={color} strokeWidth="0.8">
              <animate attributeName="r" from="10" to="44" dur={pulseDur} begin={`-${(parseFloat(pulseDur) / 2).toFixed(2)}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.75" to="0" dur={pulseDur} begin={`-${(parseFloat(pulseDur) / 2).toFixed(2)}s`} repeatCount="indefinite" />
            </circle>
          </>
        );
      })()}

      {/* Sweep — angle mirrors countdown progress (0% → 100% = 0° → 360°) */}
      <g
        style={{
          transformOrigin: '50px 50px',
          transform: `rotate(${progress * 360}deg)`,
          transition: 'transform 0.9s linear',
        }}
      >
        <path d="M50,50 L96,50 A46,46 0 0 0 70,10 Z" fill="url(#rr-sweep)" opacity="0.6" />
        <line x1="50" y1="50" x2="96" y2="50" stroke={color} strokeWidth="1.1" strokeOpacity="0.95" />
      </g>


      {/* Progress ring */}
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeOpacity="0.15"
        strokeWidth="2"
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dasharray 0.5s linear', filter: `drop-shadow(0 0 4px ${color})` }}
      />

      {/* Center dot */}
      <circle cx="50" cy="50" r="2.2" fill={color}>
        <animate attributeName="opacity" values="1;0.4;1" dur="1.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export default RoundsRadarSVG;
