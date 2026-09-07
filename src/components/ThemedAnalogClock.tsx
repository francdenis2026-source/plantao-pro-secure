import { useTheme } from '@/contexts/ThemeContext';
import { useServerClockParts } from '@/hooks/useServerTime';

interface ClockProps {
  size?: number;
  className?: string;
}

export function ThemedAnalogClock({ size = 120, className = '' }: ClockProps) {
  const { resolvedTheme } = useTheme();
  const { hours: h24, minutes, seconds } = useServerClockParts();
  const hours = h24 % 12;


  const secondDeg = seconds * 6;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = hours * 30 + minutes * 0.5;

  const center = size / 2;
  const radius = size / 2 - 4;

  // Render different clock designs based on theme
  switch (resolvedTheme) {
    case 'tactical':
      return <TacticalClock size={size} className={className} hourDeg={hourDeg} minuteDeg={minuteDeg} secondDeg={secondDeg} center={center} radius={radius} />;
    case 'cyber':
      return <CyberClock size={size} className={className} hourDeg={hourDeg} minuteDeg={minuteDeg} secondDeg={secondDeg} center={center} radius={radius} seconds={seconds} />;
    case 'crimson':
      return <CrimsonClock size={size} className={className} hourDeg={hourDeg} minuteDeg={minuteDeg} secondDeg={secondDeg} center={center} radius={radius} />;
    case 'arctic':
      return <ArcticClock size={size} className={className} hourDeg={hourDeg} minuteDeg={minuteDeg} secondDeg={secondDeg} center={center} radius={radius} />;
    case 'sovereign':
      return <SovereignClock size={size} className={className} hourDeg={hourDeg} minuteDeg={minuteDeg} secondDeg={secondDeg} center={center} radius={radius} />;
    case 'nexus':
      return <NexusClock size={size} className={className} hourDeg={hourDeg} minuteDeg={minuteDeg} secondDeg={secondDeg} center={center} radius={radius} seconds={seconds} />;
    default:
      return <TacticalClock size={size} className={className} hourDeg={hourDeg} minuteDeg={minuteDeg} secondDeg={secondDeg} center={center} radius={radius} />;
  }
}

interface ClockDesignProps {
  size: number;
  className: string;
  hourDeg: number;
  minuteDeg: number;
  secondDeg: number;
  center: number;
  radius: number;
  seconds?: number;
}

// TACTICAL: Military field watch with bold markers and rugged design
function TacticalClock({ size, className, hourDeg, minuteDeg, secondDeg, center, radius }: ClockDesignProps) {
  const hourMarkers = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const isMain = i % 3 === 0;
    const len = isMain ? 12 : 7;
    const x1 = center + Math.cos(angle) * (radius - len);
    const y1 = center + Math.sin(angle) * (radius - len);
    const x2 = center + Math.cos(angle) * (radius - 2);
    const y2 = center + Math.sin(angle) * (radius - 2);
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fbbf24" strokeWidth={isMain ? 3 : 2} strokeLinecap="round" />;
  });

  return (
    <div className={className} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="tacticalGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="tacticalFace" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1c1917" />
            <stop offset="50%" stopColor="#292524" />
            <stop offset="100%" stopColor="#1c1917" />
          </linearGradient>
        </defs>
        
        {/* Outer ring with notches */}
        <circle cx={center} cy={center} r={radius} fill="url(#tacticalFace)" stroke="#78716c" strokeWidth="3" />
        <circle cx={center} cy={center} r={radius - 8} fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.3" />
        
        {/* Hour markers */}
        {hourMarkers}
        
        {/* Tactical crosshair at 12 */}
        <path d={`M${center-4},${center-radius+18} L${center},${center-radius+14} L${center+4},${center-radius+18}`} fill="none" stroke="#fbbf24" strokeWidth="2" />
        
        {/* Hour hand - thick arrow */}
        <g transform={`rotate(${hourDeg}, ${center}, ${center})`} filter="url(#tacticalGlow)">
          <polygon 
            points={`${center},${center-radius*0.45} ${center-5},${center-radius*0.15} ${center-3},${center+8} ${center+3},${center+8} ${center+5},${center-radius*0.15}`}
            fill="#fbbf24"
          />
        </g>
        
        {/* Minute hand - sleek */}
        <g transform={`rotate(${minuteDeg}, ${center}, ${center})`} filter="url(#tacticalGlow)">
          <polygon 
            points={`${center},${center-radius*0.7} ${center-3},${center-radius*0.2} ${center-2},${center+6} ${center+2},${center+6} ${center+3},${center-radius*0.2}`}
            fill="#fcd34d"
          />
        </g>
        
        {/* Second hand - thin red */}
        <g transform={`rotate(${secondDeg}, ${center}, ${center})`}>
          <line x1={center} y1={center+10} x2={center} y2={center-radius*0.8} stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx={center} cy={center-radius*0.8} r="2" fill="#ef4444" />
        </g>
        
        {/* Center cap */}
        <circle cx={center} cy={center} r="6" fill="#fbbf24" />
        <circle cx={center} cy={center} r="3" fill="#1c1917" />
      </svg>
    </div>
  );
}

// CYBER: Neon holographic with digital segments
function CyberClock({ size, className, hourDeg, minuteDeg, secondDeg, center, radius, seconds = 0 }: ClockDesignProps) {
  const segments = Array.from({ length: 60 }, (_, i) => {
    const angle = (i * 6 - 90) * (Math.PI / 180);
    const isActive = i <= seconds;
    const x = center + Math.cos(angle) * (radius - 6);
    const y = center + Math.sin(angle) * (radius - 6);
    return (
      <circle 
        key={i} 
        cx={x} 
        cy={y} 
        r={i % 5 === 0 ? 3 : 1.5} 
        fill={isActive ? '#06b6d4' : '#4c1d95'}
        opacity={isActive ? 1 : 0.4}
        style={{ transition: 'fill 0.1s, opacity 0.1s' }}
      />
    );
  });

  return (
    <div className={className} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="cyberGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <radialGradient id="cyberFace">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0f0a1e" />
          </radialGradient>
        </defs>
        
        {/* Hexagonal frame */}
        <polygon 
          points={`${center},${center-radius} ${center+radius*0.866},${center-radius*0.5} ${center+radius*0.866},${center+radius*0.5} ${center},${center+radius} ${center-radius*0.866},${center+radius*0.5} ${center-radius*0.866},${center-radius*0.5}`}
          fill="url(#cyberFace)"
          stroke="url(#cyberGrad)"
          strokeWidth="2"
          filter="url(#cyberGlow)"
        />
        
        {/* Animated segment ring */}
        {segments}
        
        {/* Inner decorative circles */}
        <circle cx={center} cy={center} r={radius * 0.5} fill="none" stroke="#06b6d4" strokeWidth="0.5" opacity="0.3" strokeDasharray="4 4" />
        <circle cx={center} cy={center} r={radius * 0.3} fill="none" stroke="#a855f7" strokeWidth="0.5" opacity="0.3" />
        
        {/* Hour hand - neon bar */}
        <g transform={`rotate(${hourDeg}, ${center}, ${center})`} filter="url(#cyberGlow)">
          <rect x={center-3} y={center-radius*0.4} width="6" height={radius*0.4} rx="2" fill="#a855f7" />
        </g>
        
        {/* Minute hand - slim neon */}
        <g transform={`rotate(${minuteDeg}, ${center}, ${center})`} filter="url(#cyberGlow)">
          <rect x={center-2} y={center-radius*0.6} width="4" height={radius*0.6} rx="2" fill="#06b6d4" />
        </g>
        
        {/* Second hand - glowing line */}
        <g transform={`rotate(${secondDeg}, ${center}, ${center})`}>
          <line x1={center} y1={center+8} x2={center} y2={center-radius*0.75} stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" filter="url(#cyberGlow)" />
        </g>
        
        {/* Center - pulsing core */}
        <circle cx={center} cy={center} r="8" fill="#0f0a1e" stroke="url(#cyberGrad)" strokeWidth="2" />
        <circle cx={center} cy={center} r="4" fill="#06b6d4" className="animate-pulse" style={{ animationDuration: '1s' }} />
      </svg>
    </div>
  );
}

// CRIMSON: Aggressive angular design with flame accents
function CrimsonClock({ size, className, hourDeg, minuteDeg, secondDeg, center, radius }: ClockDesignProps) {
  const flames = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const x = center + Math.cos(angle) * (radius - 10);
    const y = center + Math.sin(angle) * (radius - 10);
    return (
      <g key={i} transform={`translate(${x}, ${y}) rotate(${i * 30})`}>
        <path d="M0,-6 L3,0 L0,6 L-3,0 Z" fill={i % 3 === 0 ? '#ef4444' : '#f97316'} opacity={i % 3 === 0 ? 1 : 0.6} />
      </g>
    );
  });

  return (
    <div className={className} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="crimsonGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="crimsonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
          <radialGradient id="crimsonFace">
            <stop offset="0%" stopColor="#450a0a" />
            <stop offset="100%" stopColor="#1c0a0a" />
          </radialGradient>
        </defs>
        
        {/* Outer jagged ring */}
        <circle cx={center} cy={center} r={radius} fill="url(#crimsonFace)" stroke="#ef4444" strokeWidth="3" />
        <circle cx={center} cy={center} r={radius - 5} fill="none" stroke="#f97316" strokeWidth="1" opacity="0.4" strokeDasharray="8 4" />
        
        {/* Flame markers */}
        {flames}
        
        {/* Hour hand - blade */}
        <g transform={`rotate(${hourDeg}, ${center}, ${center})`} filter="url(#crimsonGlow)">
          <polygon 
            points={`${center},${center-radius*0.45} ${center-6},${center} ${center},${center+10} ${center+6},${center}`}
            fill="url(#crimsonGrad)"
          />
        </g>
        
        {/* Minute hand - dagger */}
        <g transform={`rotate(${minuteDeg}, ${center}, ${center})`} filter="url(#crimsonGlow)">
          <polygon 
            points={`${center},${center-radius*0.65} ${center-4},${center-radius*0.1} ${center},${center+8} ${center+4},${center-radius*0.1}`}
            fill="#f97316"
          />
        </g>
        
        {/* Second hand - fire needle */}
        <g transform={`rotate(${secondDeg}, ${center}, ${center})`}>
          <line x1={center} y1={center+12} x2={center} y2={center-radius*0.8} stroke="#eab308" strokeWidth="2" strokeLinecap="round" />
          <polygon points={`${center},${center-radius*0.8} ${center-3},${center-radius*0.7} ${center+3},${center-radius*0.7}`} fill="#eab308" />
        </g>
        
        {/* Center - ember */}
        <circle cx={center} cy={center} r="8" fill="#450a0a" stroke="#ef4444" strokeWidth="2" />
        <circle cx={center} cy={center} r="4" fill="#f97316" />
      </svg>
    </div>
  );
}

// ARCTIC: Frozen crystalline with ice-blue aesthetics
function ArcticClock({ size, className, hourDeg, minuteDeg, secondDeg, center, radius }: ClockDesignProps) {
  const crystals = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const x = center + Math.cos(angle) * (radius - 8);
    const y = center + Math.sin(angle) * (radius - 8);
    const isMain = i % 3 === 0;
    return (
      <g key={i} transform={`translate(${x}, ${y}) rotate(${i * 30})`}>
        {isMain ? (
          <polygon points="0,-8 4,0 0,8 -4,0" fill="#7dd3fc" opacity="0.9" />
        ) : (
          <circle r="2" fill="#bae6fd" opacity="0.7" />
        )}
      </g>
    );
  });

  return (
    <div className={className} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="arcticGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="arcticFace">
            <stop offset="0%" stopColor="#f0f9ff" />
            <stop offset="100%" stopColor="#e0f2fe" />
          </radialGradient>
          <linearGradient id="iceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        
        {/* Frosted face */}
        <circle cx={center} cy={center} r={radius} fill="url(#arcticFace)" stroke="#7dd3fc" strokeWidth="3" />
        <circle cx={center} cy={center} r={radius - 12} fill="none" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.3" />
        
        {/* Crystal markers */}
        {crystals}
        
        {/* Frost pattern lines */}
        {[0, 60, 120, 180, 240, 300].map(deg => (
          <line 
            key={deg}
            x1={center} 
            y1={center} 
            x2={center + Math.cos((deg - 90) * Math.PI / 180) * radius * 0.3} 
            y2={center + Math.sin((deg - 90) * Math.PI / 180) * radius * 0.3}
            stroke="#bae6fd"
            strokeWidth="0.5"
            opacity="0.5"
          />
        ))}
        
        {/* Hour hand - ice shard */}
        <g transform={`rotate(${hourDeg}, ${center}, ${center})`} filter="url(#arcticGlow)">
          <polygon 
            points={`${center},${center-radius*0.4} ${center-5},${center-radius*0.15} ${center-3},${center+6} ${center+3},${center+6} ${center+5},${center-radius*0.15}`}
            fill="#0369a1"
          />
        </g>
        
        {/* Minute hand - crystal needle */}
        <g transform={`rotate(${minuteDeg}, ${center}, ${center})`} filter="url(#arcticGlow)">
          <polygon 
            points={`${center},${center-radius*0.6} ${center-3},${center-radius*0.2} ${center-2},${center+5} ${center+2},${center+5} ${center+3},${center-radius*0.2}`}
            fill="#0ea5e9"
          />
        </g>
        
        {/* Second hand - thin frost */}
        <g transform={`rotate(${secondDeg}, ${center}, ${center})`}>
          <line x1={center} y1={center+8} x2={center} y2={center-radius*0.75} stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx={center} cy={center-radius*0.75} r="2" fill="#22d3ee" />
        </g>
        
        {/* Center - snowflake */}
        <circle cx={center} cy={center} r="7" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="2" />
        <circle cx={center} cy={center} r="3" fill="#0ea5e9" />
      </svg>
    </div>
  );
}

// SOVEREIGN: Royal gold with ornate flourishes
function SovereignClock({ size, className, hourDeg, minuteDeg, secondDeg, center, radius }: ClockDesignProps) {
  const romanNumerals = ['XII', 'III', 'VI', 'IX'];
  const romanPositions = [
    { x: center, y: center - radius + 18 },
    { x: center + radius - 18, y: center },
    { x: center, y: center + radius - 14 },
    { x: center - radius + 18, y: center },
  ];

  return (
    <div className={className} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="sovereignGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <radialGradient id="sovereignFace">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
        </defs>
        
        {/* Ornate outer ring */}
        <circle cx={center} cy={center} r={radius} fill="url(#sovereignFace)" stroke="url(#goldGrad)" strokeWidth="4" />
        <circle cx={center} cy={center} r={radius - 6} fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.3" />
        
        {/* Gold hour dots */}
        {Array.from({ length: 12 }, (_, i) => {
          if (i % 3 === 0) return null;
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x = center + Math.cos(angle) * (radius - 14);
          const y = center + Math.sin(angle) * (radius - 14);
          return <circle key={i} cx={x} cy={y} r="2" fill="#fbbf24" />;
        })}
        
        {/* Roman numerals */}
        {romanNumerals.map((num, i) => (
          <text 
            key={num} 
            x={romanPositions[i].x} 
            y={romanPositions[i].y} 
            textAnchor="middle" 
            dominantBaseline="middle"
            fill="#fbbf24"
            fontSize={size * 0.08}
            fontFamily="serif"
            fontWeight="bold"
          >
            {num}
          </text>
        ))}
        
        {/* Decorative inner circle */}
        <circle cx={center} cy={center} r={radius * 0.35} fill="none" stroke="#fbbf24" strokeWidth="0.5" opacity="0.4" />
        
        {/* Hour hand - ornate */}
        <g transform={`rotate(${hourDeg}, ${center}, ${center})`} filter="url(#sovereignGlow)">
          <polygon 
            points={`${center},${center-radius*0.42} ${center-4},${center-radius*0.35} ${center-6},${center-radius*0.1} ${center-3},${center+8} ${center+3},${center+8} ${center+6},${center-radius*0.1} ${center+4},${center-radius*0.35}`}
            fill="url(#goldGrad)"
          />
        </g>
        
        {/* Minute hand - elegant */}
        <g transform={`rotate(${minuteDeg}, ${center}, ${center})`} filter="url(#sovereignGlow)">
          <polygon 
            points={`${center},${center-radius*0.62} ${center-3},${center-radius*0.5} ${center-4},${center-radius*0.15} ${center-2},${center+6} ${center+2},${center+6} ${center+4},${center-radius*0.15} ${center+3},${center-radius*0.5}`}
            fill="#fcd34d"
          />
        </g>
        
        {/* Second hand - fine gold */}
        <g transform={`rotate(${secondDeg}, ${center}, ${center})`}>
          <line x1={center} y1={center+10} x2={center} y2={center-radius*0.72} stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx={center} cy={center-radius*0.72} r="2" fill="#f472b6" />
        </g>
        
        {/* Center - jewel */}
        <circle cx={center} cy={center} r="8" fill="#0f172a" stroke="url(#goldGrad)" strokeWidth="3" />
        <circle cx={center} cy={center} r="4" fill="#fbbf24" />
      </svg>
    </div>
  );
}

// NEXUS: Matrix-style with data flow visualization
function NexusClock({ size, className, hourDeg, minuteDeg, secondDeg, center, radius, seconds = 0 }: ClockDesignProps) {
  const dataNodes = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * 15 - 90) * (Math.PI / 180);
    const r = i % 2 === 0 ? radius - 8 : radius - 14;
    const x = center + Math.cos(angle) * r;
    const y = center + Math.sin(angle) * r;
    const isActive = (seconds * 0.4) % 24 > i;
    return (
      <rect 
        key={i}
        x={x - 2}
        y={y - 2}
        width="4"
        height="4"
        rx="1"
        fill={isActive ? '#10b981' : '#064e3b'}
        opacity={isActive ? 1 : 0.5}
        transform={`rotate(${i * 15}, ${x}, ${y})`}
        style={{ transition: 'fill 0.15s' }}
      />
    );
  });

  return (
    <div className={className} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="nexusGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="nexusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
          <radialGradient id="nexusFace">
            <stop offset="0%" stopColor="#042f2e" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </radialGradient>
        </defs>
        
        {/* Matrix-style face */}
        <circle cx={center} cy={center} r={radius} fill="url(#nexusFace)" stroke="#10b981" strokeWidth="2" />
        
        {/* Grid lines */}
        <line x1={center - radius + 10} y1={center} x2={center + radius - 10} y2={center} stroke="#10b981" strokeWidth="0.5" opacity="0.2" />
        <line x1={center} y1={center - radius + 10} x2={center} y2={center + radius - 10} stroke="#10b981" strokeWidth="0.5" opacity="0.2" />
        
        {/* Animated data nodes */}
        {dataNodes}
        
        {/* Connection lines */}
        {[0, 90, 180, 270].map(deg => {
          const angle = (deg - 90) * Math.PI / 180;
          return (
            <line 
              key={deg}
              x1={center + Math.cos(angle) * 15}
              y1={center + Math.sin(angle) * 15}
              x2={center + Math.cos(angle) * (radius - 20)}
              y2={center + Math.sin(angle) * (radius - 20)}
              stroke="#10b981"
              strokeWidth="1"
              opacity="0.3"
              strokeDasharray="4 4"
            />
          );
        })}
        
        {/* Hour hand - data bar */}
        <g transform={`rotate(${hourDeg}, ${center}, ${center})`} filter="url(#nexusGlow)">
          <rect x={center-4} y={center-radius*0.4} width="8" height={radius*0.4} rx="2" fill="#10b981" />
          <rect x={center-2} y={center-radius*0.38} width="4" height={radius*0.35} rx="1" fill="#34d399" />
        </g>
        
        {/* Minute hand - slim terminal */}
        <g transform={`rotate(${minuteDeg}, ${center}, ${center})`} filter="url(#nexusGlow)">
          <rect x={center-3} y={center-radius*0.58} width="6" height={radius*0.58} rx="2" fill="#14b8a6" />
          <rect x={center-1} y={center-radius*0.55} width="2" height={radius*0.5} rx="1" fill="#5eead4" />
        </g>
        
        {/* Second hand - scanning beam */}
        <g transform={`rotate(${secondDeg}, ${center}, ${center})`}>
          <line x1={center} y1={center+10} x2={center} y2={center-radius*0.75} stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
          <rect x={center-3} y={center-radius*0.75-3} width="6" height="6" rx="1" fill="#22d3ee" />
        </g>
        
        {/* Center - node hub */}
        <circle cx={center} cy={center} r="10" fill="#042f2e" stroke="#10b981" strokeWidth="2" />
        <circle cx={center} cy={center} r="5" fill="#10b981" />
        <circle cx={center} cy={center} r="2" fill="#5eead4" />
      </svg>
    </div>
  );
}
