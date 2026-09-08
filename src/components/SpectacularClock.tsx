import { useTheme } from '@/contexts/ThemeContext';
import { useServerClockParts } from '@/hooks/useServerTime';

interface SpectacularClockProps {
  size?: number;
  className?: string;
}

export function SpectacularClock({ size = 80, className = '' }: SpectacularClockProps) {
  const { resolvedTheme } = useTheme();
  const { hours, minutes, seconds } = useServerClockParts();


  const secondDeg = seconds * 6;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = (hours % 12) * 30 + minutes * 0.5;

  const center = size / 2;
  const radius = size / 2 - 4;

  // Theme-specific colors
  const themeColors: Record<string, {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
    bg: string;
  }> = {
    tactical: {
      primary: '#22c55e',
      secondary: '#4ade80',
      accent: '#ef4444',
      glow: 'rgba(34, 197, 94, 0.5)',
      bg: '#0f172a',
    },
    cyber: {
      primary: '#06b6d4',
      secondary: '#a855f7',
      accent: '#22d3ee',
      glow: 'rgba(6, 182, 212, 0.5)',
      bg: '#0f0a1e',
    },
    crimson: {
      primary: '#ef4444',
      secondary: '#f97316',
      accent: '#fbbf24',
      glow: 'rgba(239, 68, 68, 0.5)',
      bg: '#1c0a0a',
    },
    arctic: {
      primary: '#0ea5e9',
      secondary: '#7dd3fc',
      accent: '#22d3ee',
      glow: 'rgba(14, 165, 233, 0.5)',
      bg: '#0c1929',
    },
    military: {
      primary: '#fbbf24',
      secondary: '#f59e0b',
      accent: '#ef4444',
      glow: 'rgba(251, 191, 36, 0.5)',
      bg: '#1c1917',
    },
    sentinel: {
      primary: '#f97316',
      secondary: '#fb923c',
      accent: '#ef4444',
      glow: 'rgba(249, 115, 22, 0.5)',
      bg: '#1c1917',
    },
    stealth: {
      primary: '#94a3b8',
      secondary: '#cbd5e1',
      accent: '#6366f1',
      glow: 'rgba(148, 163, 184, 0.4)',
      bg: '#0f172a',
    },
    nightops: {
      primary: '#8b5cf6',
      secondary: '#a78bfa',
      accent: '#c084fc',
      glow: 'rgba(139, 92, 246, 0.5)',
      bg: '#0f0a1e',
    },
    ember: {
      primary: '#fb923c',
      secondary: '#f97316',
      accent: '#fbbf24',
      glow: 'rgba(251, 146, 60, 0.5)',
      bg: '#1c1917',
    },
    sovereign: {
      primary: '#fbbf24',
      secondary: '#fcd34d',
      accent: '#f59e0b',
      glow: 'rgba(251, 191, 36, 0.5)',
      bg: '#1e1b4b',
    },
    nexus: {
      primary: '#8b5cf6',
      secondary: '#c084fc',
      accent: '#d946ef',
      glow: 'rgba(139, 92, 246, 0.5)',
      bg: '#0f0a1e',
    },
  };

  const colors = themeColors[resolvedTheme || 'tactical'] || themeColors.tactical;

  // Digital time display
  const formatDigital = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Outer glow ring */}
      <div 
        className="absolute inset-0 rounded-full animate-pulse"
        style={{
          background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
          filter: 'blur(8px)',
        }}
      />
      
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative z-10">
        <defs>
          {/* Gradient definitions */}
          <linearGradient id={`clockGrad-${resolvedTheme}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} />
            <stop offset="100%" stopColor={colors.secondary} />
          </linearGradient>
          
          <radialGradient id={`clockFace-${resolvedTheme}`}>
            <stop offset="0%" stopColor={colors.bg} stopOpacity="0.95" />
            <stop offset="100%" stopColor={colors.bg} stopOpacity="1" />
          </radialGradient>
          
          <filter id={`clockGlow-${resolvedTheme}`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Rotating gradient for outer ring */}
          <linearGradient id={`rotatingGrad-${resolvedTheme}`} gradientTransform="rotate(45)">
            <stop offset="0%" stopColor={colors.primary}>
              <animate attributeName="stop-color" values={`${colors.primary}; ${colors.secondary}; ${colors.primary}`} dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor={colors.secondary}>
              <animate attributeName="stop-color" values={`${colors.secondary}; ${colors.primary}; ${colors.secondary}`} dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor={colors.accent}>
              <animate attributeName="stop-color" values={`${colors.accent}; ${colors.primary}; ${colors.accent}`} dur="3s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
        </defs>

        {/* Background circle with animated border */}
        <circle 
          cx={center} 
          cy={center} 
          r={radius} 
          fill={`url(#clockFace-${resolvedTheme})`}
          stroke={`url(#rotatingGrad-${resolvedTheme})`}
          strokeWidth="3"
        />
        
        {/* Inner ring with tick marks */}
        <circle 
          cx={center} 
          cy={center} 
          r={radius - 6} 
          fill="none"
          stroke={colors.primary}
          strokeWidth="0.5"
          opacity="0.3"
        />

        {/* Hour markers */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const isQuarter = i % 3 === 0;
          const innerR = radius - (isQuarter ? 10 : 7);
          const outerR = radius - 4;
          const x1 = center + Math.cos(angle) * innerR;
          const y1 = center + Math.sin(angle) * innerR;
          const x2 = center + Math.cos(angle) * outerR;
          const y2 = center + Math.sin(angle) * outerR;
          
          return (
            <line 
              key={i}
              x1={x1} 
              y1={y1} 
              x2={x2} 
              y2={y2}
              stroke={isQuarter ? colors.primary : colors.secondary}
              strokeWidth={isQuarter ? 2 : 1}
              strokeLinecap="round"
              opacity={isQuarter ? 1 : 0.6}
            />
          );
        })}

        {/* Minute ticks */}
        {Array.from({ length: 60 }, (_, i) => {
          if (i % 5 === 0) return null;
          const angle = (i * 6 - 90) * (Math.PI / 180);
          const x = center + Math.cos(angle) * (radius - 5);
          const y = center + Math.sin(angle) * (radius - 5);
          
          return (
            <circle 
              key={`min-${i}`}
              cx={x}
              cy={y}
              r="0.5"
              fill={colors.secondary}
              opacity="0.4"
            />
          );
        })}

        {/* Hour hand */}
        <g transform={`rotate(${hourDeg}, ${center}, ${center})`} filter={`url(#clockGlow-${resolvedTheme})`}>
          <polygon 
            points={`
              ${center},${center - radius * 0.4}
              ${center - 4},${center - radius * 0.1}
              ${center - 2.5},${center + 6}
              ${center + 2.5},${center + 6}
              ${center + 4},${center - radius * 0.1}
            `}
            fill={colors.primary}
          />
        </g>

        {/* Minute hand */}
        <g transform={`rotate(${minuteDeg}, ${center}, ${center})`} filter={`url(#clockGlow-${resolvedTheme})`}>
          <polygon 
            points={`
              ${center},${center - radius * 0.65}
              ${center - 2.5},${center - radius * 0.1}
              ${center - 1.5},${center + 5}
              ${center + 1.5},${center + 5}
              ${center + 2.5},${center - radius * 0.1}
            `}
            fill={colors.secondary}
          />
        </g>

        {/* Second hand with smooth animation */}
        <g transform={`rotate(${secondDeg}, ${center}, ${center})`}>
          <line 
            x1={center} 
            y1={center + 8} 
            x2={center} 
            y2={center - radius * 0.75}
            stroke={colors.accent}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle 
            cx={center} 
            cy={center - radius * 0.75}
            r="2"
            fill={colors.accent}
          />
        </g>

        {/* Center jewel */}
        <circle 
          cx={center} 
          cy={center} 
          r="5"
          fill={colors.bg}
          stroke={`url(#clockGrad-${resolvedTheme})`}
          strokeWidth="2"
        />
        <circle 
          cx={center} 
          cy={center} 
          r="2"
          fill={colors.primary}
        />

        {/* Digital time overlay (subtle) */}
        <text 
          x={center} 
          y={center + radius * 0.35}
          textAnchor="middle"
          fill={colors.primary}
          fontSize={size * 0.09}
          fontFamily="monospace"
          fontWeight="bold"
          opacity="0.7"
        >
          {formatDigital(hours)}:{formatDigital(minutes)}
        </text>
      </svg>

      {/* Scanning line animation */}
      <div 
        className="absolute inset-2 rounded-full overflow-hidden pointer-events-none"
        style={{ opacity: 0.3 }}
      >
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(0deg, transparent 0%, ${colors.glow} 50%, transparent 100%)`,
            height: '200%',
            animation: 'scanLine 3s linear infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes scanLine {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0%); }
        }
      `}</style>
    </div>
  );
}
