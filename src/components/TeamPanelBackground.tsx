import { teamPosters, teamColors } from '@/lib/teamAssets';
import { cn } from '@/lib/utils';

interface TeamPanelBackgroundProps {
  team: string | null;
  className?: string;
  children?: React.ReactNode;
  opacity?: number;
}

export function TeamPanelBackground({ 
  team, 
  className,
  children,
  opacity = 0.15
}: TeamPanelBackgroundProps) {
  const poster = team ? teamPosters[team.toUpperCase() as keyof typeof teamPosters] : null;
  const colors = team ? teamColors[team.toUpperCase() as keyof typeof teamColors] : null;

  return (
    <div className={cn("relative min-h-screen", className)}>
      {/* Team poster background */}
      {poster && (
        <>
          <div 
            className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
            style={{ 
              backgroundImage: `url(${poster})`,
              opacity: opacity,
              filter: 'blur(2px)',
            }}
          />
          {/* Gradient overlay with team color accent */}
          <div 
            className="fixed inset-0 pointer-events-none z-0"
            style={{
              background: `linear-gradient(180deg, 
                rgba(15, 23, 42, 0.95) 0%, 
                rgba(15, 23, 42, 0.85) 30%,
                ${colors?.glow || 'rgba(0,0,0,0.3)'} 50%,
                rgba(15, 23, 42, 0.9) 70%,
                rgba(15, 23, 42, 0.98) 100%
              )`,
            }}
          />
          {/* Animated team color accent line at top */}
          <div 
            className="fixed top-0 left-0 right-0 h-1 z-10 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent, ${colors?.primary || '#fff'}, transparent)`,
            }}
          />
        </>
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

// Smaller version for cards/sections
export function TeamBadgeBackground({ 
  team, 
  className,
  children 
}: { 
  team: string | null; 
  className?: string;
  children?: React.ReactNode;
}) {
  const poster = team ? teamPosters[team.toUpperCase() as keyof typeof teamPosters] : null;

  if (!poster) return <div className={className}>{children}</div>;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{ backgroundImage: `url(${poster})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/80 to-slate-900/60" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
