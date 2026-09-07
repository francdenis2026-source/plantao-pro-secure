import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState, useMemo } from 'react';
import { TacticalGrid } from './dashboard/TacticalGrid';
import { getThemeAssets, BackgroundEffect } from '@/lib/themeAssets';
import { teamPosters, teamPostersWebp, teamColors } from '@/lib/teamAssets';
import { homeBackground, homeBackgroundWebp } from '@/lib/teamAssets';

// Team images mosaic for home screen background
function TeamMosaicBackground() {
  const teams = ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'] as const;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Home background image — WebP with PNG fallback via image-set() */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15"
        style={{
          backgroundImage: `image-set(url(${homeBackgroundWebp}) type("image/webp"), url(${homeBackground}) type("image/png"))`,
        }}
      />

      {/* Team posters mosaic overlay */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-10">
        {teams.map((team) => (
          <div
            key={team}
            className="relative bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `image-set(url(${teamPostersWebp[team]}) type("image/webp"), url(${teamPosters[team]}) type("image/jpeg"))`,
            }}
          >
            <div 
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, 
                  ${teamColors[team].glow} 0%, 
                  transparent 30%,
                  transparent 70%,
                  ${teamColors[team].glow} 100%
                )`,
              }}
            />
          </div>
        ))}
      </div>
      
      {/* Central vignette overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, transparent 0%, hsl(var(--background)) 70%)`,
        }}
      />
    </div>
  );
}

// Particle effect component
function ParticleField({ effect }: { effect: BackgroundEffect }) {
  const count = Math.min(effect.particleCount || 30, 12);
  const particles = useMemo(() => 
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      size: effect.intensity === 'high' ? Math.random() * 4 + 2 : 
            effect.intensity === 'medium' ? Math.random() * 3 + 1 : Math.random() * 2 + 0.5,
      duration: effect.speed === 'fast' ? 2 + Math.random() * 3 :
                effect.speed === 'medium' ? 4 + Math.random() * 4 : 6 + Math.random() * 6,
    })), [count, effect.intensity, effect.speed]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            backgroundColor: effect.primaryColor,
            boxShadow: `0 0 ${p.size * 4}px ${effect.primaryColor}`,
          }}
        />
      ))}
    </div>
  );
}

// Matrix rain effect component
function MatrixRain({ effect }: { effect: BackgroundEffect }) {
  const columns = effect.intensity === 'high' ? 12 : effect.intensity === 'medium' ? 8 : 5;
  
  return (
    <div className="absolute inset-0 overflow-hidden opacity-20">
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className="absolute top-0 font-mono text-xs animate-scan"
          style={{
            left: `${4 + i * (100 / columns)}%`,
            animationDuration: `${effect.speed === 'fast' ? 2 + Math.random() * 2 : 
                                  effect.speed === 'medium' ? 4 + Math.random() * 3 : 6 + Math.random() * 4}s`,
            animationDelay: `${Math.random() * 3}s`,
            color: effect.primaryColor,
          }}
        >
          {Array.from({ length: 20 }).map((_, j) => (
            <div key={j} className="my-1" style={{ opacity: 1 - j * 0.05 }}>
              {String.fromCharCode(0x30A0 + Math.random() * 96)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Hexagon grid effect
function HexagonGrid({ effect }: { effect: BackgroundEffect }) {
  return (
    <svg className="absolute inset-0 w-full h-full" style={{ opacity: effect.intensity === 'high' ? 0.15 : effect.intensity === 'medium' ? 0.1 : 0.05 }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="hexagons-pattern" patternUnits="userSpaceOnUse" width="60" height="52">
          <polygon 
            points="30,0 60,15 60,37 30,52 0,37 0,15" 
            fill="none" 
            stroke={effect.primaryColor}
            strokeWidth="0.5" 
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hexagons-pattern)" />
    </svg>
  );
}

// Radar sweep effect
function RadarSweep({ effect }: { effect: BackgroundEffect }) {
  const blipCount = effect.intensity === 'high' ? 6 : effect.intensity === 'medium' ? 4 : 2;
  const rings = effect.intensity === 'high' ? 6 : effect.intensity === 'medium' ? 4 : 3;
  
  return (
    <div className="absolute top-1/2 left-1/2 w-[900px] h-[900px] -translate-x-1/2 -translate-y-1/2">
      {Array.from({ length: rings }).map((_, i) => (
        <div 
          key={i}
          className="absolute rounded-full border"
          style={{
            inset: `${i * 8}%`,
            borderColor: effect.primaryColor.replace(')', ', 0.2)').replace('rgba', 'rgba'),
          }}
        />
      ))}
      <div 
        className="absolute top-0 bottom-0 left-1/2 w-[1px]"
        style={{ background: `linear-gradient(to bottom, transparent, ${effect.primaryColor}, transparent)` }}
      />
      <div 
        className="absolute left-0 right-0 top-1/2 h-[1px]"
        style={{ background: `linear-gradient(to right, transparent, ${effect.primaryColor}, transparent)` }}
      />
      <div 
        className="absolute inset-0 rounded-full animate-radar"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, ${effect.primaryColor} 30deg, transparent 60deg)`,
          animationDuration: effect.speed === 'fast' ? '3s' : effect.speed === 'medium' ? '4s' : '6s',
        }}
      />
      {Array.from({ length: blipCount }).map((_, i) => (
        <div 
          key={i}
          className="absolute w-2 h-2 rounded-full animate-pulse"
          style={{
            top: `${25 + Math.random() * 50}%`,
            left: `${25 + Math.random() * 50}%`,
            animationDelay: `${i * 0.3}s`,
            backgroundColor: effect.primaryColor,
            boxShadow: `0 0 10px ${effect.primaryColor}`,
          }}
        />
      ))}
    </div>
  );
}

// Grid overlay effect
function GridOverlay({ effect }: { effect: BackgroundEffect }) {
  return null;
}

// Scanline effect
function ScanlineEffect({ effect }: { effect: BackgroundEffect }) {
  return (
    <>
      <div 
        className="absolute inset-0"
        style={{
          opacity: effect.intensity === 'high' ? 0.08 : effect.intensity === 'medium' ? 0.05 : 0.02,
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            ${effect.primaryColor} 2px,
            ${effect.primaryColor} 4px
          )`,
        }}
      />
      {effect.animated && (
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute w-full h-[2px] animate-scan"
            style={{ 
              background: `linear-gradient(to right, transparent, ${effect.primaryColor}, transparent)`,
              animationDuration: effect.speed === 'fast' ? '2s' : effect.speed === 'medium' ? '4s' : '6s',
            }}
          />
        </div>
      )}
    </>
  );
}

// Frost crystal effect
function FrostEffect({ effect }: { effect: BackgroundEffect }) {
  const crystalCount = effect.intensity === 'high' ? 8 : effect.intensity === 'medium' ? 5 : 3;
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {Array.from({ length: crystalCount }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-pulse"
          style={{
            left: `${10 + i * (80 / crystalCount)}%`,
            top: `${10 + (i % 3) * 30}%`,
            width: '80px',
            height: '80px',
            background: `conic-gradient(from ${i * 60}deg, transparent, ${effect.primaryColor}, transparent)`,
            borderRadius: '50%',
            animationDuration: `${3 + i * 0.5}s`,
            opacity: effect.intensity === 'high' ? 0.3 : effect.intensity === 'medium' ? 0.2 : 0.1,
          }}
        />
      ))}
      {/* Snowfall particles */}
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={`snow-${i}`}
          className="absolute rounded-full animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            animationDuration: `${8 + Math.random() * 6}s`,
            animationDelay: `${Math.random() * 5}s`,
            boxShadow: '0 0 6px rgba(255, 255, 255, 0.6)',
          }}
        />
      ))}
    </div>
  );
}

// Flame effect
function FlameEffect({ effect }: { effect: BackgroundEffect }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Rising embers */}
      {Array.from({ length: effect.intensity === 'high' ? 18 : 10 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-rise"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: '-10px',
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            backgroundColor: i % 3 === 0 ? effect.primaryColor : (effect.secondaryColor || effect.primaryColor),
            animationDuration: `${3 + Math.random() * 4}s`,
            animationDelay: `${Math.random() * 3}s`,
            boxShadow: `0 0 8px ${effect.primaryColor}`,
          }}
        />
      ))}
      {/* Base flame glow */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: `linear-gradient(to top, ${effect.primaryColor}, transparent)`,
          opacity: 0.15,
        }}
      />
      {/* Warning stripes */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 opacity-40"
        style={{ background: `linear-gradient(to right, ${effect.primaryColor}, ${effect.secondaryColor || effect.primaryColor}, ${effect.primaryColor})` }}
      />
      <div 
        className="absolute bottom-0 left-0 right-0 h-1 opacity-40"
        style={{ background: `linear-gradient(to right, ${effect.primaryColor}, ${effect.secondaryColor || effect.primaryColor}, ${effect.primaryColor})` }}
      />
    </div>
  );
}

// Dot pattern effect
function DotsPattern({ effect }: { effect: BackgroundEffect }) {
  return (
    <div 
      className="absolute inset-0"
      style={{
        opacity: effect.intensity === 'high' ? 0.12 : effect.intensity === 'medium' ? 0.08 : 0.04,
        backgroundImage: `radial-gradient(circle, ${effect.primaryColor} 1.5px, transparent 1.5px)`,
        backgroundSize: '40px 40px',
      }}
    />
  );
}

// Ambient orbs effect
function AmbientOrbs({ effect }: { effect: BackgroundEffect }) {
  const orbCount = effect.intensity === 'high' ? 5 : effect.intensity === 'medium' ? 3 : 2;
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {Array.from({ length: orbCount }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full blur-2xl"
          style={{
            left: `${(i * 30) + 10}%`,
            top: `${(i % 2) * 40 + 20}%`,
            width: `${200 + i * 100}px`,
            height: `${200 + i * 100}px`,
            background: i % 2 === 0 ? effect.primaryColor : (effect.secondaryColor || effect.primaryColor),
            animationDuration: `${4 + i}s`,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
}

// Waves effect
function WavesEffect({ effect }: { effect: BackgroundEffect }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-48 overflow-hidden opacity-20">
      <div 
        className="absolute bottom-0 left-0 right-0 h-24"
        style={{
          background: `linear-gradient(to top, ${effect.primaryColor}, transparent)`,
          borderRadius: '50% 50% 0 0',
          animationDuration: '4s',
        }}
      />
      <div 
        className="absolute bottom-0 left-[10%] right-[10%] h-16"
        style={{
          background: `linear-gradient(to top, ${effect.primaryColor}, transparent)`,
          borderRadius: '50% 50% 0 0',
          animationDuration: '3s',
          animationDelay: '0.5s',
        }}
      />
    </div>
  );
}

// Effect renderer
function RenderEffect({ effect }: { effect: BackgroundEffect }) {
  switch (effect.type) {
    case 'particles':
      return <ParticleField effect={effect} />;
    case 'matrix':
      return <MatrixRain effect={effect} />;
    case 'hexagons':
      return <HexagonGrid effect={effect} />;
    case 'radar':
      return <RadarSweep effect={effect} />;
    case 'grid':
      return <GridOverlay effect={effect} />;
    case 'scanlines':
      return <ScanlineEffect effect={effect} />;
    case 'frost':
      return <FrostEffect effect={effect} />;
    case 'flames':
      return <FlameEffect effect={effect} />;
    case 'dots':
      return <DotsPattern effect={effect} />;
    case 'orbs':
      return <AmbientOrbs effect={effect} />;
    case 'waves':
      return <WavesEffect effect={effect} />;
    default:
      return null;
  }
}

// Corner accents component
function CornerAccents({ style, color }: { style: string; color: string }) {
  if (style === 'none') return null;
  
  const baseClasses = "absolute w-16 h-16 transition-colors";
  
  if (style === 'tactical' || style === 'military') {
    return (
      <>
        <div className={`${baseClasses} top-8 left-8 border-l-2 border-t-2 ${color}`} />
        <div className={`${baseClasses} top-8 right-8 border-r-2 border-t-2 ${color}`} />
        <div className={`${baseClasses} bottom-8 left-8 border-l-2 border-b-2 ${color}`} />
        <div className={`${baseClasses} bottom-8 right-8 border-r-2 border-b-2 ${color}`} />
      </>
    );
  }
  
  if (style === 'tech') {
    return (
      <>
        <div className="absolute top-6 left-6 w-24 h-24">
          <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r ${color.replace('border-', 'from-')} to-transparent`} />
          <div className={`absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b ${color.replace('border-', 'from-')} to-transparent`} />
          <div className="absolute top-4 left-4 text-[8px] font-mono text-primary/60">SYS:ACTIVE</div>
        </div>
        <div className="absolute top-6 right-6 w-24 h-24">
          <div className={`absolute top-0 right-0 w-full h-[2px] bg-gradient-to-l ${color.replace('border-', 'from-')} to-transparent`} />
          <div className={`absolute top-0 right-0 w-[2px] h-full bg-gradient-to-b ${color.replace('border-', 'from-')} to-transparent`} />
        </div>
      </>
    );
  }
  
  if (style === 'frost') {
    return (
      <>
        <div className={`${baseClasses} top-4 left-4 border-l border-t ${color} rounded-tl-xl opacity-50`} />
        <div className={`${baseClasses} top-4 right-4 border-r border-t ${color} rounded-tr-xl opacity-50`} />
        <div className={`${baseClasses} bottom-4 left-4 border-l border-b ${color} rounded-bl-xl opacity-50`} />
        <div className={`${baseClasses} bottom-4 right-4 border-r border-b ${color} rounded-br-xl opacity-50`} />
      </>
    );
  }
  
  if (style === 'flame') {
    return (
      <>
        <div className={`${baseClasses} top-4 left-4 border-l-2 border-t-2 ${color}`} style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
        <div className={`${baseClasses} top-4 right-4 border-r-2 border-t-2 ${color}`} style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
      </>
    );
  }
  
  // minimal
  return (
    <>
      <div className={`absolute top-8 left-8 w-8 h-8 border-l border-t ${color}`} />
      <div className={`absolute top-8 right-8 w-8 h-8 border-r border-t ${color}`} />
    </>
  );
}

export function ThemedBackground() {
  const { theme, resolvedTheme, themeConfig } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showTacticalGrid, setShowTacticalGrid] = useState(false);
  // Só renderizamos os elementos decorativos (grid tático, efeitos, orbes
  // com blur) depois que a tela principal já pintou. Isso evita competir
  // com o LCP e reduz o custo de GPU/CPU no primeiro frame.
  const [decorReady, setDecorReady] = useState(false);

  const themeAssets = getThemeAssets(theme, resolvedTheme);

  useEffect(() => {
    setMounted(true);
    const tacticalThemes = ['tactical', 'military', 'sentinel', 'cyber', 'stealth'];
    setShowTacticalGrid(tacticalThemes.includes(resolvedTheme));
  }, [resolvedTheme]);

  useEffect(() => {
    if (!mounted) return;
    // Aguarda o browser ficar ocioso (após o primeiro paint) para montar
    // os enfeites. Fallback: 600ms em navegadores sem requestIdleCallback.
    let idleId: number | undefined;
    let timeoutId: number | undefined;
    const schedule = () => {
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      };
      if (typeof w.requestIdleCallback === 'function') {
        idleId = w.requestIdleCallback(() => setDecorReady(true), { timeout: 1200 });
      } else {
        timeoutId = window.setTimeout(() => setDecorReady(true), 600);
      }
    };
    // Espera 2 frames para garantir que a UI principal já pintou.
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(schedule);
      timeoutId = raf2 as unknown as number;
    });
    return () => {
      cancelAnimationFrame(raf1);
      const w = window as Window & { cancelIdleCallback?: (id: number) => void };
      if (idleId != null && w.cancelIdleCallback) w.cancelIdleCallback(idleId);
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Mosaico base — leve, entra junto com a UI principal */}
      <TeamMosaicBackground />

      {/* Gradiente ambiente base — barato, entra imediato */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: `
            radial-gradient(ellipse at 30% 0%, ${themeAssets.ambientGlow.primary} 0%, transparent 50%),
            radial-gradient(ellipse at 70% 100%, ${themeAssets.ambientGlow.secondary} 0%, transparent 50%)
            ${themeAssets.ambientGlow.tertiary ? `, radial-gradient(ellipse at 50% 50%, ${themeAssets.ambientGlow.tertiary} 0%, transparent 40%)` : ''}
          `,
        }}
      />

      {/* Vinheta base — barata */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, hsl(var(--background) / 0.4) 100%)',
        }}
      />

      {/* ===== Decorações pesadas: só depois do primeiro paint ===== */}
      {decorReady && (
        <>
          {showTacticalGrid && (
            <TacticalGrid nodeCount={40} animationSpeed="slow" className="z-0" />
          )}

          {themeAssets.backgroundEffects.map((effect, index) => (
            <RenderEffect key={`${effect.type}-${index}`} effect={effect} />
          ))}

          <CornerAccents
            style={themeAssets.cornerAccents.style}
            color={themeAssets.cornerAccents.color}
          />

          {/* Glow orbs (estáticas, filter:blur é caro — só após o LCP) */}
          <div
            className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-2xl animate-fade-in"
            style={{ background: themeAssets.ambientGlow.primary }}
          />
          <div
            className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full blur-2xl animate-fade-in"
            style={{ background: themeAssets.ambientGlow.secondary }}
          />
          {themeAssets.ambientGlow.tertiary && (
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-2xl opacity-50 animate-fade-in"
              style={{ background: `radial-gradient(circle, ${themeAssets.ambientGlow.tertiary} 0%, transparent 70%)` }}
            />
          )}
        </>
      )}
    </div>
  );
}
