import { useState, useEffect } from 'react';
import { useTheme, themes } from '@/contexts/ThemeContext';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { cn } from '@/lib/utils';
import { 
  Shield, Cpu, Snowflake, Flame, Volume2, VolumeX,
  Radio, Activity, Zap, Target, Crosshair,
  Check, ChevronDown, Hexagon, Triangle, Diamond, Circle,
  Sparkles, Gauge, Heart, Eye, Waves, Star, Crown, Network, Wifi
} from 'lucide-react';
import { ThemedAnalogClock } from '@/components/ThemedAnalogClock';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ThemedHeaderProps {
  selectedTeam?: string | null;
  onThemeOpen?: () => void;
}

// Theme-specific header configurations
const headerStyles = {
  tactical: {
    bg: 'from-amber-950/95 via-slate-900/98 to-amber-950/95',
    border: 'border-amber-500/40',
    accent: 'text-amber-400',
    glow: 'shadow-amber-500/20',
    statusBg: 'bg-amber-500/10 border-amber-500/40',
    statusText: 'text-amber-400',
    operationalText: 'TÁTICO',
  },
  cyber: {
    bg: 'from-cyan-950/95 via-slate-900/98 to-fuchsia-950/95',
    border: 'border-cyan-500/40',
    accent: 'text-cyan-400',
    glow: 'shadow-cyan-500/20',
    statusBg: 'bg-cyan-500/10 border-cyan-500/40',
    statusText: 'text-cyan-400',
    operationalText: 'CYBER',
  },
  crimson: {
    bg: 'from-red-950/95 via-slate-900/98 to-red-950/95',
    border: 'border-red-500/40',
    accent: 'text-red-400',
    glow: 'shadow-red-500/20',
    statusBg: 'bg-red-500/10 border-red-500/40',
    statusText: 'text-red-400',
    operationalText: 'ALERTA',
  },
  arctic: {
    bg: 'from-sky-950/95 via-slate-900/98 to-sky-950/95',
    border: 'border-sky-400/40',
    accent: 'text-sky-300',
    glow: 'shadow-sky-400/20',
    statusBg: 'bg-sky-500/10 border-sky-400/40',
    statusText: 'text-sky-300',
    operationalText: 'ÁRTICO',
  },
  // NEW: Sovereign - Premium gold institutional
  sovereign: {
    bg: 'from-yellow-950/95 via-stone-900/98 to-amber-950/95',
    border: 'border-yellow-500/40',
    accent: 'text-yellow-400',
    glow: 'shadow-yellow-500/25',
    statusBg: 'bg-yellow-500/10 border-yellow-500/40',
    statusText: 'text-yellow-400',
    operationalText: 'SOBERANO',
  },
  // NEW: Nexus - Matrix green network
  nexus: {
    bg: 'from-emerald-950/95 via-slate-900/98 to-green-950/95',
    border: 'border-emerald-500/40',
    accent: 'text-emerald-400',
    glow: 'shadow-emerald-500/25',
    statusBg: 'bg-emerald-500/10 border-emerald-500/40',
    statusText: 'text-emerald-400',
    operationalText: 'NEXUS',
  },
  system: {
    bg: 'from-slate-900/95 via-slate-800/98 to-slate-900/95',
    border: 'border-primary/40',
    accent: 'text-primary',
    glow: 'shadow-primary/20',
    statusBg: 'bg-primary/10 border-primary/40',
    statusText: 'text-primary',
    operationalText: 'AUTO',
  },
};

// Team-specific messages
const teamMessages = {
  ALFA: { text: 'ALFA', icon: Shield, color: 'text-red-400' },
  BRAVO: { text: 'BRAVO', icon: Target, color: 'text-blue-400' },
  CHARLIE: { text: 'CHARLIE', icon: Crosshair, color: 'text-green-400' },
  DELTA: { text: 'DELTA', icon: Radio, color: 'text-amber-400' },
};

export function ThemedHeader({ selectedTeam }: ThemedHeaderProps) {
  const { theme, setTheme, themeConfig, resolvedTheme } = useTheme();
  const { playSound, isSoundEnabled, toggleSound } = useSoundEffects();
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [pulseState, setPulseState] = useState(0);
  
  const effectiveTheme = theme === 'system' ? (resolvedTheme as keyof typeof headerStyles) : theme;
  const style = headerStyles[effectiveTheme] || headerStyles.tactical;
  const teamConfig = selectedTeam ? teamMessages[selectedTeam as keyof typeof teamMessages] : null;

  useEffect(() => {
    const pulse = setInterval(() => setPulseState(p => (p + 1) % 100), 50);
    return () => clearInterval(pulse);
  }, []);

  const availableThemes = Object.values(themes).filter(t => 
    ['tactical', 'cyber', 'crimson', 'arctic', 'sovereign', 'nexus', 'system'].includes(t.id)
  );

  const handleThemeChange = (themeId: string) => {
    playSound('theme-change');
    setTheme(themeId as any);
    setIsThemeDropdownOpen(false);
  };

  // Unique center widget for each theme
  const renderCenterWidget = () => {
    switch (effectiveTheme) {
      case 'tactical':
        // Military-style gauge meter
        return (
          <div className="flex items-center gap-3 px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-900/30 to-amber-800/20 border border-amber-500/30">
            <div className="flex items-center gap-1">
              <Gauge className="h-5 w-5 text-amber-400" />
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "w-1.5 h-4 rounded-sm transition-all duration-300",
                      i < 4 ? "bg-amber-400" : "bg-amber-400/30"
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="h-4 w-px bg-amber-500/30" />
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-amber-300" />
              <span className="text-[10px] font-bold text-amber-300 tracking-wider">PRONTO</span>
            </div>
          </div>
        );
      
      case 'cyber':
        // Digital matrix display
        return (
          <div className="flex items-center gap-3 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-900/30 via-fuchsia-900/20 to-cyan-900/30 border border-cyan-500/30">
            <div className="flex items-center gap-1">
              <Cpu className="h-5 w-5 text-cyan-400" />
              <div className="grid grid-cols-4 gap-0.5">
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "w-1.5 h-1.5 rounded-sm transition-all",
                      (pulseState + i) % 4 === 0 ? "bg-fuchsia-400" : "bg-cyan-400/60"
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="font-mono text-[10px] text-cyan-300">
              <span className="text-fuchsia-400">0x</span>
              {Math.floor(pulseState).toString(16).toUpperCase().padStart(2, '0')}
              <span className="text-cyan-400/50">F</span>
            </div>
          </div>
        );
      
      case 'crimson':
        // Alert heartbeat monitor
        return (
          <div className="flex items-center gap-3 px-4 py-1.5 rounded-lg bg-gradient-to-r from-red-900/40 to-red-800/20 border border-red-500/40">
            <Heart className={cn("h-5 w-5 text-red-400", pulseState % 20 < 5 && "scale-110")} />
            <div className="flex items-end gap-px h-5">
              {[2, 5, 3, 8, 4, 6, 3, 7, 2].map((h, i) => (
                <div 
                  key={i}
                  className="w-1 bg-red-400 rounded-t-sm transition-all duration-100"
                  style={{ 
                    height: `${Math.abs(Math.sin((pulseState + i * 10) * 0.1)) * h + 4}px`,
                    opacity: 0.5 + Math.abs(Math.sin((pulseState + i * 10) * 0.1)) * 0.5
                  }}
                />
              ))}
            </div>
            <div className="text-[10px] font-bold text-red-300 tabular-nums">
              {72 + Math.floor(Math.sin(pulseState * 0.1) * 8)} BPM
            </div>
          </div>
        );
      
      case 'arctic':
        // Ice crystal formation
        return (
          <div className="flex items-center gap-3 px-4 py-1.5 rounded-lg bg-gradient-to-r from-sky-900/30 to-sky-800/20 border border-sky-400/30">
            <div className="relative">
              <Snowflake className="h-6 w-6 text-sky-300" style={{ transform: `rotate(${pulseState * 2}deg)` }} />
              <div className="absolute -inset-1 rounded-full bg-sky-400/10 animate-pulse" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[9px] text-sky-400/60 uppercase">Temp</span>
              <span className="text-sm font-bold text-sky-200 tabular-nums">
                -{(18 + Math.floor(Math.sin(pulseState * 0.05) * 3)).toFixed(0)}°C
              </span>
            </div>
            <Waves className="h-4 w-4 text-sky-300/60" />
          </div>
        );
      
      case 'sovereign':
        // Premium gold institutional meter
        return (
          <div className="flex items-center gap-3 px-4 py-1.5 rounded-lg bg-gradient-to-r from-yellow-900/40 to-amber-800/30 border border-yellow-500/40">
            <Crown className="h-5 w-5 text-yellow-400" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-yellow-300 tracking-wider">AUTORIDADE</span>
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            </div>
            <span className="text-[10px] font-mono text-yellow-400/70">GOV</span>
          </div>
        );
      
      case 'nexus':
        // Matrix network monitor
        return (
          <div className="flex items-center gap-3 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-900/40 to-green-800/30 border border-emerald-500/40">
            <Network className="h-5 w-5 text-emerald-400" />
            <div className="font-mono text-[10px] text-emerald-300">
              <span className="text-green-400">[</span>
              ONLINE
              <span className="text-green-400">]</span>
            </div>
            <Wifi className="h-4 w-4 text-emerald-400/60 animate-pulse" />
          </div>
        );
      
      default: // system
        // Auto-detect visualization
        return (
          <div className="flex items-center gap-3 px-4 py-1.5 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30">
            <Eye className="h-5 w-5 text-primary" />
            <div className="flex gap-1">
              {['T', 'C', 'A'].map((letter, i) => (
                <span 
                  key={letter}
                  className={cn(
                    "w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold transition-all",
                    pulseState % 3 === i 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-primary/20 text-primary/60"
                  )}
                >
                  {letter}
                </span>
              ))}
            </div>
            <Sparkles className="h-4 w-4 text-primary/60" />
          </div>
        );
    }
  };

  // Theme-specific left status indicator
  const renderStatusIndicator = () => {
    const icons = {
      tactical: <Hexagon className="h-4 w-4" />,
      cyber: <Diamond className="h-4 w-4" />,
      crimson: <Triangle className="h-4 w-4" />,
      arctic: <Circle className="h-4 w-4" />,
      light: <Star className="h-4 w-4" />,
      system: <Zap className="h-4 w-4" />,
    };

    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-lg",
        style.statusBg, style.glow
      )}>
        <div className={cn("relative", style.statusText)}>
          {icons[effectiveTheme] || icons.tactical}
          <div className="absolute inset-0 animate-ping opacity-30">
            {icons[effectiveTheme] || icons.tactical}
          </div>
        </div>
        <span className={cn("text-[10px] font-bold uppercase tracking-wider", style.statusText)}>
          {style.operationalText}
        </span>
      </div>
    );
  };

  // CSS variables centralize accent line styling across all breakpoints
  const accentVars = {
    '--accent-thickness': '2px',
    '--accent-opacity': '0.9',
    '--accent-inset': '8px',
    '--accent-color': 'hsl(var(--primary))',
  } as React.CSSProperties;

  return (
    <div
      style={accentVars}
      className={cn(
        "header-bar bg-gradient-to-r backdrop-blur-md border-b py-2 px-3 sm:px-4 relative z-20 shrink-0 transition-all duration-500",
        style.bg, style.border, style.glow
      )}
    >
      {/* Golden accent line — bottom (mirrors footer) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30"
        style={{
          height: 'var(--accent-thickness)',
          opacity: 'var(--accent-opacity)',
          background: 'linear-gradient(90deg, transparent 0%, var(--accent-color) 25%, var(--accent-color) 75%, transparent 100%)',
        }}
      />
      {/* Golden accent line — left edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 max-h-full z-30"
        style={{
          width: 'var(--accent-thickness)',
          height: 'calc(100% - var(--accent-inset))',
          opacity: 'var(--accent-opacity)',
          background: 'linear-gradient(180deg, transparent 0%, var(--accent-color) 30%, var(--accent-color) 70%, transparent 100%)',
        }}
      />
      {/* Golden accent line — right edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 max-h-full z-30"
        style={{
          width: 'var(--accent-thickness)',
          height: 'calc(100% - var(--accent-inset))',
          opacity: 'var(--accent-opacity)',
          background: 'linear-gradient(180deg, transparent 0%, var(--accent-color) 30%, var(--accent-color) 70%, transparent 100%)',
        }}
      />


      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between gap-2">
          
          {/* Left: Status Indicator */}
          <div className="flex items-center gap-2 sm:gap-3">
            {renderStatusIndicator()}
            
            {/* Team Badge (if selected) */}
            {teamConfig && (
              <div className={cn(
                "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-600/40",
                teamConfig.color
              )}>
                <teamConfig.icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">{teamConfig.text}</span>
              </div>
            )}
          </div>
          
          {/* Center: Unique Theme Widget */}
          <div className="hidden sm:flex">
            {renderCenterWidget()}
          </div>
          
          {/* Right: Theme Selector & Clock */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Theme Dropdown */}
            <DropdownMenu open={isThemeDropdownOpen} onOpenChange={setIsThemeDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={() => playSound('click')}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1.5 rounded-lg border transition-all duration-200 hover:scale-105",
                    "bg-primary/10 border-primary/40 hover:bg-primary/20"
                  )}
                >
                  <themeConfig.icon className="h-4 w-4 text-primary" />
                  <ChevronDown className="h-3 w-3 text-primary/60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card/98 backdrop-blur-xl border-primary/30">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Selecionar Tema</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableThemes.map((t) => {
                  const Icon = t.icon;
                  return (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => handleThemeChange(t.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color: `hsl(${t.colors.primary})` }} />
                        <span className="text-sm">{t.name}</span>
                      </div>
                      {theme === t.id && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    toggleSound();
                    playSound('click');
                  }}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    <span className="text-sm">Sons Táticos</span>
                  </div>
                  <div className={cn(
                    "w-8 h-4 rounded-full transition-colors",
                    isSoundEnabled ? "bg-primary" : "bg-muted"
                  )}>
                    <div className={cn(
                      "w-3 h-3 rounded-full bg-white transition-transform mt-0.5",
                      isSoundEnabled ? "translate-x-4 ml-0.5" : "translate-x-0.5"
                    )} />
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Compact Analog Clock */}
            <div className={cn(
              "flex items-center justify-center p-1.5 rounded-lg border shadow-lg backdrop-blur-sm",
              "bg-card/80",
              style.border
            )}>
              <ThemedAnalogClock size={36} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
