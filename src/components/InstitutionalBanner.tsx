import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Shield, Zap, Radio } from 'lucide-react';
import logoOfficialAsset from '@/assets/logo-plantao-pro-official.png.asset.json';
const logoShield = logoOfficialAsset.url;
const logoShieldWebp = logoOfficialAsset.url;
import bannerBg from '@/assets/institutional-banner-bg.jpg';

interface InstitutionalBannerProps {
  onSettingsClick?: () => void;
}

// Theme-specific visual effects and styling
const themeConfigs: Record<string, {
  gradient: string;
  glowColor: string;
  accentColor: string;
  borderColor: string;
  pattern: 'hexagon' | 'circuit' | 'military' | 'frost' | 'fire' | 'waves' | 'classic';
  animation: string;
}> = {
  tactical: {
    gradient: 'from-emerald-400 via-green-300 to-emerald-500',
    glowColor: 'rgba(16, 185, 129, 0.6)',
    accentColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/50',
    pattern: 'military',
    animation: 'animate-pulse',
  },
  cyber: {
    gradient: 'from-cyan-400 via-blue-400 to-purple-500',
    glowColor: 'rgba(6, 182, 212, 0.6)',
    accentColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/50',
    pattern: 'circuit',
    animation: 'animate-gradient-x',
  },
  crimson: {
    gradient: 'from-red-400 via-rose-400 to-orange-400',
    glowColor: 'rgba(239, 68, 68, 0.6)',
    accentColor: 'text-red-400',
    borderColor: 'border-red-500/50',
    pattern: 'fire',
    animation: 'animate-pulse',
  },
  arctic: {
    gradient: 'from-blue-300 via-cyan-200 to-white',
    glowColor: 'rgba(147, 197, 253, 0.6)',
    accentColor: 'text-blue-300',
    borderColor: 'border-blue-300/50',
    pattern: 'frost',
    animation: 'animate-gradient-x',
  },
  military: {
    gradient: 'from-amber-400 via-yellow-400 to-amber-500',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    accentColor: 'text-amber-400',
    borderColor: 'border-amber-500/50',
    pattern: 'military',
    animation: 'animate-pulse',
  },
  sentinel: {
    gradient: 'from-orange-400 via-amber-400 to-yellow-400',
    glowColor: 'rgba(249, 115, 22, 0.6)',
    accentColor: 'text-orange-400',
    borderColor: 'border-orange-500/50',
    pattern: 'military',
    animation: 'animate-pulse',
  },
  stealth: {
    gradient: 'from-slate-300 via-zinc-300 to-slate-400',
    glowColor: 'rgba(148, 163, 184, 0.5)',
    accentColor: 'text-slate-300',
    borderColor: 'border-slate-500/50',
    pattern: 'hexagon',
    animation: 'animate-gradient-x',
  },
  nightops: {
    gradient: 'from-indigo-400 via-purple-400 to-violet-400',
    glowColor: 'rgba(99, 102, 241, 0.6)',
    accentColor: 'text-indigo-400',
    borderColor: 'border-indigo-500/50',
    pattern: 'hexagon',
    animation: 'animate-pulse',
  },
  ember: {
    gradient: 'from-orange-300 via-red-400 to-amber-400',
    glowColor: 'rgba(251, 146, 60, 0.6)',
    accentColor: 'text-orange-400',
    borderColor: 'border-orange-500/50',
    pattern: 'fire',
    animation: 'animate-gradient-x',
  },
  sovereign: {
    gradient: 'from-amber-300 via-yellow-400 to-amber-500',
    glowColor: 'rgba(251, 191, 36, 0.6)',
    accentColor: 'text-amber-400',
    borderColor: 'border-amber-500/50',
    pattern: 'classic',
    animation: 'animate-pulse',
  },
  nexus: {
    gradient: 'from-violet-400 via-purple-400 to-fuchsia-400',
    glowColor: 'rgba(139, 92, 246, 0.6)',
    accentColor: 'text-violet-400',
    borderColor: 'border-violet-500/50',
    pattern: 'circuit',
    animation: 'animate-gradient-x',
  },
};

// Pattern SVG backgrounds
const patterns: Record<string, string> = {
  hexagon: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  circuit: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%2300ffff' fill-opacity='0.03'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm63 31a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM34 90a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm56-76a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 86a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm28-65a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm23-11a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  military: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  frost: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpolygon fill-rule='evenodd' points='8 4 12 6 8 8 6 12 4 8 0 6 4 4 6 0'/%3E%3C/g%3E%3C/svg%3E")`,
  fire: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='52' height='26' viewBox='0 0 52 26'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23ff6600' fill-opacity='0.04'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  waves: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='20' viewBox='0 0 100 20'%3E%3Cpath fill='%23ffffff' fill-opacity='0.04' d='M21.184 20c.357-.13.72-.264 1.088-.402l1.768-.661C33.64 15.347 39.647 14 50 14c10.271 0 15.362 1.222 24.629 4.928.955.383 1.869.74 2.75 1.072h6.225c-2.51-.73-5.139-1.691-8.233-2.928C65.888 13.278 60.562 12 50 12c-10.626 0-16.855 1.397-26.66 5.063l-1.767.662c-2.475.923-4.66 1.674-6.724 2.275h6.335zm0-20C13.258 2.892 8.077 4 0 4V2c5.744 0 9.951-.574 14.85-2h6.334zM77.38 0C85.239 2.966 90.502 4 100 4V2c-6.842 0-11.386-.542-16.396-2h-6.225zM0 14c8.44 0 13.718-1.21 22.272-4.402l1.768-.661C33.64 5.347 39.647 4 50 4c10.271 0 15.362 1.222 24.629 4.928C84.112 12.722 89.438 14 100 14v-2c-10.271 0-15.362-1.222-24.629-4.928C65.888 3.278 60.562 2 50 2 39.374 2 33.145 3.397 23.34 7.063l-1.767.662C13.223 10.84 8.163 12 0 12v2z'/%3E%3C/svg%3E")`,
  classic: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d4af37' fill-opacity='0.05' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
};

export function InstitutionalBanner({ onSettingsClick }: InstitutionalBannerProps) {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme;
  const config = themeConfigs[currentTheme] || themeConfigs.tactical;

  return (
    <div className="relative w-full overflow-hidden">
      {/* Realistic photo background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bannerBg})` }}
        aria-hidden="true"
      />
      {/* Darkening overlay for legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-slate-950/95" />

      {/* Background with pattern */}
      <div 
        className="absolute inset-0 opacity-30 mix-blend-overlay"
        style={{ backgroundImage: patterns[config.pattern] }}
      />
      
      {/* Animated glow effect */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse at center, ${config.glowColor} 0%, transparent 70%)`,
        }}
      />
      
      {/* Main content */}
      <div className={cn(
        "relative z-10 py-3 sm:py-4 px-4 sm:px-6",
        "border-y-2",
        config.borderColor,
        "bg-transparent"
      )}>
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 rounded-tl-lg" style={{ borderColor: `hsl(var(--primary))` }} />
        <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 rounded-tr-lg" style={{ borderColor: `hsl(var(--primary))` }} />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 rounded-bl-lg" style={{ borderColor: `hsl(var(--primary))` }} />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 rounded-br-lg" style={{ borderColor: `hsl(var(--primary))` }} />

        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* Left: Logo + ISE/ACRE badge */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="relative flex-shrink-0 aspect-square h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 flex items-center justify-center cursor-pointer"
              title="PlantãoPro — Brasão oficial"
              onClick={() => {
                const w = window as unknown as { __logoClicks?: number; __logoTimer?: number };
                w.__logoClicks = (w.__logoClicks || 0) + 1;
                if (w.__logoTimer) window.clearTimeout(w.__logoTimer);
                w.__logoTimer = window.setTimeout(() => { w.__logoClicks = 0; }, 800);
                if (w.__logoClicks >= 3) {
                  w.__logoClicks = 0;
                  window.dispatchEvent(new CustomEvent('open-master-login'));
                }
              }}
            >
              <img
                src={logoShield}
                alt="PlantãoPro — Brasão oficial"
                width={128}
                height={128}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="max-h-full max-w-full h-full w-full object-contain drop-shadow-[0_6px_18px_rgba(201,168,76,0.45)] select-none"
                draggable={false}
              />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className={cn(
                "text-sm sm:text-base md:text-lg font-black tracking-[0.15em] uppercase",
                config.accentColor,
                "drop-shadow-[0_0_8px_currentColor]"
              )}>
                ISE / ACRE
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground/70 tracking-wider font-medium">
                Socioeducativo
              </span>
            </div>
          </div>
          
          {/* Center: PLANTÃO PRO - Main Title */}
          <div className="text-center flex-1 px-2">
            {/* Main Title with premium effects */}
            <div className="relative inline-block">
              {/* Glow behind text */}
              <div 
                className="absolute inset-0 blur-3xl opacity-70"
                style={{ background: `linear-gradient(90deg, transparent, ${config.glowColor}, transparent)` }}
              />
              
              <div className="relative flex items-center justify-center gap-2 sm:gap-3">
                {/* Left decorative element */}
                <div className="hidden sm:flex items-center gap-1">
                  <div className="h-px w-6 sm:w-10 bg-gradient-to-r from-transparent to-primary/60" />
                  <Zap className={cn("h-3 w-3 sm:h-4 sm:w-4", config.accentColor, "animate-pulse")} />
                </div>
                
                {/* App Name */}
                <h1 className={cn(
                  "relative text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight",
                  "bg-gradient-to-r bg-clip-text text-transparent",
                  config.gradient
                )}
                style={{
                  textShadow: `0 0 40px ${config.glowColor}, 0 0 80px ${config.glowColor}`,
                  WebkitBackgroundClip: 'text',
                }}>
                  PLANTÃO PRO
                </h1>
                
                {/* Right decorative element */}
                <div className="hidden sm:flex items-center gap-1">
                  <Radio className={cn("h-3 w-3 sm:h-4 sm:w-4", config.accentColor, "animate-pulse")} />
                  <div className="h-px w-6 sm:w-10 bg-gradient-to-l from-transparent to-primary/60" />
                </div>
              </div>
            </div>
            
            {/* Subtitle with shimmer */}
            <div className="relative mt-0.5 sm:mt-1">
              <p className={cn(
                "text-[8px] sm:text-[10px] md:text-xs font-bold tracking-[0.15em] sm:tracking-[0.25em] uppercase",
                "text-muted-foreground/80",
                "drop-shadow-[0_0_4px_currentColor]"
              )}>
                Gestão Inteligente de Plantões
              </p>
            </div>
          </div>
          
          {/* Right: Status indicator */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg",
              "bg-slate-800/60 border border-slate-600/40",
              "text-emerald-400"
            )}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[9px] sm:text-xs font-bold tracking-wider uppercase hidden sm:inline">
                Online
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </div>
  );
}
