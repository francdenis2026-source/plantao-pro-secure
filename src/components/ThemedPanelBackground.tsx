import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState, forwardRef } from 'react';
import { getThemeAssets } from '@/lib/themeAssets';
import { teamPosters, teamColors } from '@/lib/teamAssets';
import { cn } from '@/lib/utils';
import { CommandRoomBackground } from '@/components/home/CommandRoomBackground';
import splashAsset from '@/assets/brand/plantaopro-splash.jpg.asset.json';
import splashAvif from '@/assets/brand/plantaopro-splash.avif.asset.json';
import splashWebp from '@/assets/brand/plantaopro-splash.webp.asset.json';

const PANEL_BRAND_BG = splashAsset.url;
const PANEL_BRAND_BG_IMAGE_SET = `image-set(url("${splashAvif.url}") type("image/avif"), url("${splashWebp.url}") type("image/webp"), url("${splashAsset.url}") type("image/jpeg"))`;

interface ThemedPanelBackgroundProps {
  team?: string | null;
  className?: string;
  children?: React.ReactNode;
  showTeamImage?: boolean;
  lowEffects?: boolean;
}

// Theme-specific panel effects
function ThemePanelEffects({ theme }: { theme: string }) {
  if (theme === 'cyber') {
    return (
      <>
        {/* Neon glow corners */}
        <div className="fixed top-0 left-0 w-32 h-32 pointer-events-none" style={{
          background: 'radial-gradient(circle at top left, rgba(6, 182, 212, 0.15), transparent 70%)',
        }} />
        <div className="fixed bottom-0 right-0 w-32 h-32 pointer-events-none" style={{
          background: 'radial-gradient(circle at bottom right, rgba(168, 85, 247, 0.15), transparent 70%)',
        }} />
      </>
    );
  }
  
  if (theme === 'military' || theme === 'sentinel') {
    return (
      <>
        {/* Radar sweep effect */}
        <div className="fixed top-1/2 left-1/2 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
          <div className="absolute inset-0 rounded-full border border-green-500/20" />
          <div className="absolute inset-[15%] rounded-full border border-green-500/15" />
          <div className="absolute inset-[30%] rounded-full border border-green-500/10" />
        </div>
        {/* Corner brackets */}
        <div className="fixed top-4 left-4 w-12 h-12 border-l-2 border-t-2 border-green-500/20 pointer-events-none" />
        <div className="fixed top-4 right-4 w-12 h-12 border-r-2 border-t-2 border-green-500/20 pointer-events-none" />
        <div className="fixed bottom-4 left-4 w-12 h-12 border-l-2 border-b-2 border-green-500/20 pointer-events-none" />
        <div className="fixed bottom-4 right-4 w-12 h-12 border-r-2 border-b-2 border-green-500/20 pointer-events-none" />
      </>
    );
  }
  
  if (theme === 'crimson') {
    return (
      <>
        {/* Fire glow at bottom */}
        <div className="fixed bottom-0 left-0 right-0 h-48 pointer-events-none" style={{
          background: 'linear-gradient(to top, rgba(239, 68, 68, 0.1), transparent)',
        }} />
        {/* Warning bar at top */}
        <div className="fixed top-0 left-0 right-0 h-1 pointer-events-none" style={{
          background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.5), rgba(249, 115, 22, 0.5), rgba(239, 68, 68, 0.5))',
        }} />
      </>
    );
  }
  
  if (theme === 'arctic') {
    return (
      <>
        {/* Frost at top */}
        <div className="fixed top-0 left-0 right-0 h-24 pointer-events-none" style={{
          background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.05), transparent)',
        }} />
        {/* Ice crystals */}
        <div className="fixed top-20 right-10 w-8 h-8 border border-sky-400/10 rotate-45 pointer-events-none" />
        <div className="fixed bottom-32 left-10 w-6 h-6 border border-cyan-400/10 rotate-12 pointer-events-none" />
      </>
    );
  }
  
  if (theme === 'tactical') {
    return (
      <>
        {/* Amber accent corners */}
        <div className="fixed top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-amber-500/20 pointer-events-none" />
        <div className="fixed top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-amber-500/20 pointer-events-none" />
      </>
    );
  }
  
  if (theme === 'stealth' || theme === 'nightops') {
    return (
      <>
        {/* Very subtle scanlines */}
        <div className="fixed inset-0 pointer-events-none opacity-5" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(100, 100, 100, 0.2) 2px, rgba(100, 100, 100, 0.2) 4px)',
        }} />
      </>
    );
  }
  
  // Default - clean background, no grid overlay.
  return null;
}

export const ThemedPanelBackground = forwardRef<HTMLDivElement, ThemedPanelBackgroundProps>(function ThemedPanelBackground({ 
  team, 
  className,
  children,
  showTeamImage = true,
  lowEffects = false,
}, ref) {
  const { theme, resolvedTheme, themeConfig } = useTheme();
  const themeAssets = getThemeAssets(theme, resolvedTheme);
  const [mounted, setMounted] = useState(false);
  
  const poster = team ? teamPosters[team.toUpperCase() as keyof typeof teamPosters] : null;
  const colors = team ? teamColors[team.toUpperCase() as keyof typeof teamColors] : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div ref={ref} className={cn("relative min-h-[100dvh] h-[100dvh] w-full flex flex-col overflow-hidden", className)}>
      {/* Base background — single flat layer, no will-change (avoids
          promoting extra compositor layers that cost memory on mobile). */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `linear-gradient(160deg,
            hsl(222 47% 8%) 0%,
            hsl(222 47% 12%) 50%,
            hsl(220 47% 6%) 100%
          )`,
        }}
      />

      {/* Brand splash background — arte oficial PlantãoPro como BG padrão
          do painel do agente (opacidade elevada para destacar o agente
          socioeducativo + viatura). Removido o CommandRoom grid escuro
          conforme solicitação do usuário. */}
      {!lowEffects && (
        <div
          aria-hidden
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: `${PANEL_BRAND_BG_IMAGE_SET}, url(${PANEL_BRAND_BG})`,
            backgroundPosition: 'center right',
            opacity: 0.28,
            filter: 'saturate(1.15) contrast(1.05)',
          }}
        />
      )}

      {/* Vignette to reinforce card legibility on top of the splash */}
      {!lowEffects && (
        <div
          aria-hidden
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 0%, rgba(3,5,10,0.55) 70%, rgba(3,5,10,0.9) 100%)',
          }}
        />
      )}

      {/* Team poster — one image + one solid overlay. Removed the second
          heavy gradient (was double-composited on every scroll frame). */}
      {mounted && !lowEffects && showTeamImage && poster && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
          style={{
            backgroundImage: `url(${poster})`,
            opacity: 0.10,
            filter: 'saturate(1.1)',
          }}
        />
      )}

      {/* Theme-specific ambient glow (kept — single radial layer). */}
      {!lowEffects && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: `
              radial-gradient(ellipse at 5% 15%, ${themeAssets.ambientGlow.primary} 0%, transparent 45%),
              radial-gradient(ellipse at 95% 85%, ${themeAssets.ambientGlow.secondary} 0%, transparent 45%)
            `,
          }}
        />
      )}

      {/* Theme-specific panel effects */}
      {mounted && !lowEffects && <ThemePanelEffects theme={resolvedTheme} />}

      {/* Team color accent line at top */}
      {!lowEffects && colors && (
        <div
          className="absolute top-0 left-0 right-0 h-1 z-20 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent 5%, ${colors.primary} 25%, ${colors.primary} 75%, transparent 95%)`,
          }}
        />
      )}

      {/* Content - Full width, allows scrolling */}
      <div className="relative z-10 flex-1 flex flex-col w-full min-w-0 min-h-full">
        {children}
      </div>
    </div>
  );
});

