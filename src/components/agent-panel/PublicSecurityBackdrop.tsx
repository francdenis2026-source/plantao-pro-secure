interface PublicSecurityBackdropProps {
  minimal?: boolean;
}

/**
 * Decorative SVG backdrop for the Agent Panel.
 * Minimal mode keeps only two cheap paint layers for smooth tab switching.
 */
export function PublicSecurityBackdrop({ minimal = false }: PublicSecurityBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        transform: 'translateZ(0)',
        contain: 'strict',
      }}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="psbCenter" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="hsl(45 90% 55% / 0.03)" />
            <stop offset="70%" stopColor="hsl(220 60% 10% / 0)" />
            <stop offset="100%" stopColor="hsl(220 70% 3% / 0.25)" />
          </radialGradient>
          <pattern id="psbGridCoarse" x="0" y="0" width="240" height="240" patternUnits="userSpaceOnUse">
            <path d="M240 0H0V240" fill="none" stroke="hsl(220 60% 80% / 0.10)" strokeWidth="1" />
          </pattern>
        </defs>

        <rect width="1920" height="1080" fill="url(#psbCenter)" />
        <rect width="1920" height="1080" fill="url(#psbGridCoarse)" />

        {!minimal && (
          <>
            <g transform="translate(240 560)" opacity="0.18">
              <path
                d="M0 -240 L200 -155 L200 65 C200 185 110 260 0 305 C-110 260 -200 185 -200 65 L-200 -155 Z"
                fill="hsl(220 60% 8% / 0.20)"
                stroke="hsl(45 90% 60%)"
                strokeWidth="2.5"
              />
              <path d="M0 -80 L21 -25 L78 -25 L32 10 L48 65 L0 30 L-48 65 L-32 10 L-78 -25 L-21 -25 Z" fill="hsl(45 90% 60%)" opacity="0.75" />
            </g>

            <g transform="translate(1640 540)" opacity="0.18">
              {[180, 320, 440].map((r) => (
                <circle key={r} cx="0" cy="0" r={r} fill="none" stroke="hsl(220 75% 78%)" strokeWidth="0.9" />
              ))}
              <line x1="-460" y1="0" x2="460" y2="0" stroke="hsl(220 75% 78%)" strokeWidth="0.8" />
              <line x1="0" y1="-460" x2="0" y2="460" stroke="hsl(220 75% 78%)" strokeWidth="0.8" />
            </g>
          </>
        )}
      </svg>
    </div>
  );
}
