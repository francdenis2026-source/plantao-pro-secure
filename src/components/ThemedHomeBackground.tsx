import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState, useMemo } from 'react';
import { getThemeAssets } from '@/lib/themeAssets';
import { teamPosters, teamPostersWebp, teamColors, homeBackground } from '@/lib/teamAssets';
import realisticHomeBgAsset from '@/assets/home-command-center.jpg.asset.json';
const realisticHomeBg = realisticHomeBgAsset.url;



const teams = ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'] as const;

// Get featured team based on theme
function getThemeFeaturedTeam(theme: string): typeof teams[number] {
  const themeTeamMap: Record<string, typeof teams[number]> = {
    tactical: 'ALFA',
    military: 'BRAVO',
    cyber: 'CHARLIE',
    classic: 'DELTA',
    crimson: 'ALFA',
    arctic: 'CHARLIE',
    stealth: 'DELTA',
    sentinel: 'BRAVO',
    nightops: 'DELTA',
    light: 'ALFA',
    system: 'ALFA',
  };
  return themeTeamMap[theme] || 'ALFA';
}

// Rotating team image component
function RotatingTeamBackground({ theme }: { theme: string }) {
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const featuredTeam = getThemeFeaturedTeam(theme);
  
  // Start with the featured team for this theme
  useEffect(() => {
    const index = teams.indexOf(featuredTeam);
    setCurrentTeamIndex(index >= 0 ? index : 0);
  }, [featuredTeam]);
  
  // Rotate every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTeamIndex((prev) => (prev + 1) % teams.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);
  
  const currentTeam = teams[currentTeamIndex];
  const teamColor = teamColors[currentTeam];
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Main rotating team image */}
      {teams.map((team, index) => (
        <div
          key={team}
          className="absolute inset-0 transition-all duration-1500 ease-in-out bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `image-set(url(${teamPostersWebp[team]}) type("image/webp"), url(${teamPosters[team]}) type("image/jpeg"))`,
            opacity: index === currentTeamIndex ? 0.25 : 0,
            transform: `scale(${index === currentTeamIndex ? 1.05 : 1.1})`,
          }}
        />
      ))}
      
      {/* Team color overlay */}
      <div 
        className="absolute inset-0 transition-all duration-1500"
        style={{
          background: `linear-gradient(135deg, 
            ${teamColor.glow} 0%, 
            transparent 40%,
            transparent 60%,
            ${teamColor.glow} 100%
          )`,
        }}
      />
      
      {/* Dark vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, 
            transparent 0%, 
            hsl(var(--background) / 0.6) 50%,
            hsl(var(--background) / 0.95) 100%
          )`,
        }}
      />
      
      {/* Team indicator dots */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {teams.map((team, index) => (
          <button
            key={team}
            onClick={() => setCurrentTeamIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentTeamIndex 
                ? 'bg-primary scale-125' 
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// Theme-specific decorative elements
function ThemeDecorations({ theme }: { theme: string }) {
  const themeAssets = getThemeAssets(theme as any, theme as any);
  
  // Different decorations based on theme
  if (theme === 'cyber') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Floating hexagons */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-cyan-500/20 rotate-45 animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-24 h-24 border border-purple-500/20 rotate-12 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
    );
  }
  
  if (theme === 'military' || theme === 'sentinel') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Camouflage pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          background: `
            radial-gradient(ellipse at 20% 30%, rgba(34, 197, 94, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, rgba(16, 185, 129, 0.2) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(20, 184, 166, 0.15) 0%, transparent 60%)
          `,
        }} />
        {/* Tactical corner markers */}
        <div className="absolute top-8 left-8 w-20 h-20 border-l-2 border-t-2 border-green-500/30" />
        <div className="absolute top-8 right-8 w-20 h-20 border-r-2 border-t-2 border-green-500/30" />
        <div className="absolute bottom-20 left-8 w-20 h-20 border-l-2 border-b-2 border-green-500/30" />
        <div className="absolute bottom-20 right-8 w-20 h-20 border-r-2 border-b-2 border-green-500/30" />
      </div>
    );
  }
  
  if (theme === 'crimson') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Fire gradient at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-64" style={{
          background: 'linear-gradient(to top, rgba(239, 68, 68, 0.15), transparent)',
        }} />
        {/* Warning stripes */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500/40 via-orange-500/40 to-red-500/40" />
      </div>
    );
  }
  
  if (theme === 'arctic') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Frost overlay at edges */}
        <div className="absolute top-0 left-0 right-0 h-32" style={{
          background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.08), transparent)',
        }} />
        <div className="absolute bottom-20 left-0 right-0 h-32" style={{
          background: 'linear-gradient(to top, rgba(56, 189, 248, 0.1), transparent)',
        }} />
        {/* Crystal accents */}
        <div className="absolute top-1/4 right-10 w-16 h-16 border border-sky-400/20 rotate-45" />
        <div className="absolute bottom-1/3 left-10 w-12 h-12 border border-cyan-400/20 rotate-12" />
      </div>
    );
  }
  
  if (theme === 'stealth' || theme === 'nightops') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle scanlines */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(100, 100, 100, 0.3) 2px, rgba(100, 100, 100, 0.3) 4px)',
        }} />
      </div>
    );
  }
  
  // Default tactical decorations
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Corner accents */}
      <div className="absolute top-6 left-6 w-16 h-16 border-l-2 border-t-2 border-primary/20" />
      <div className="absolute top-6 right-6 w-16 h-16 border-r-2 border-t-2 border-primary/20" />
    </div>
  );
}

export function ThemedHomeBackground() {
  const { theme, resolvedTheme, themeConfig } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const themeAssets = getThemeAssets(theme, resolvedTheme);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Base dark gradient */}
      {/* Realistic photographic base */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${realisticHomeBg})` }}
      />
      {/* Dark tonal wash for legibility */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg,
            hsl(var(--background) / 0.75) 0%,
            hsl(var(--background) / 0.55) 50%,
            hsl(var(--background) / 0.85) 100%
          )`,
        }}
      />

      {/* Rotating team images */}
      <RotatingTeamBackground theme={resolvedTheme} />

      
      {/* Theme-specific ambient glow */}
      <div 
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: `
            radial-gradient(ellipse at 20% 10%, ${themeAssets.ambientGlow.primary} 0%, transparent 50%),
            radial-gradient(ellipse at 80% 90%, ${themeAssets.ambientGlow.secondary} 0%, transparent 50%)
            ${themeAssets.ambientGlow.tertiary ? `, radial-gradient(ellipse at 50% 50%, ${themeAssets.ambientGlow.tertiary} 0%, transparent 40%)` : ''}
          `,
        }}
      />
      
      {/* Theme-specific decorations */}
      <ThemeDecorations theme={resolvedTheme} />
      
      {/* Top accent line with theme color */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 z-30"
        style={{
          background: `linear-gradient(90deg, 
            transparent, 
            hsl(var(--primary)) 30%, 
            hsl(var(--primary)) 70%, 
            transparent
          )`,
        }}
      />
    </div>
  );
}
