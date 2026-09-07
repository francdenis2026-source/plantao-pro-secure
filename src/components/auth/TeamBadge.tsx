import { cn } from '@/lib/utils';
import { Shield, Target, Radio, Zap } from 'lucide-react';
import { getTeamEmblem } from '@/lib/teamAssets';

type TeamName = 'ALFA' | 'BRAVO' | 'CHARLIE' | 'DELTA';

interface TeamBadgeProps {
  team: TeamName;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const teamConfig: Record<TeamName, {
  icon: typeof Shield;
  color: string;
  bg: string;
  border: string;
  glow: string;
}> = {
  ALFA: {
    icon: Shield,
    color: 'text-emerald-300',
    bg: 'from-emerald-500/20 to-emerald-700/10',
    border: 'border-emerald-500/40',
    glow: 'shadow-emerald-500/30',
  },
  BRAVO: {
    icon: Target,
    color: 'text-orange-300',
    bg: 'from-orange-500/20 to-orange-700/10',
    border: 'border-orange-500/40',
    glow: 'shadow-orange-500/30',
  },
  CHARLIE: {
    icon: Radio,
    color: 'text-blue-300',
    bg: 'from-blue-500/20 to-blue-700/10',
    border: 'border-blue-500/40',
    glow: 'shadow-blue-500/30',
  },
  DELTA: {
    icon: Zap,
    color: 'text-amber-300',
    bg: 'from-amber-500/20 to-amber-700/10',
    border: 'border-amber-500/40',
    glow: 'shadow-amber-500/30',
  },
};

const sizeStyles = {
  sm: { container: 'px-3 py-1.5 gap-2', emblem: 'w-5 h-5', text: 'text-sm' },
  md: { container: 'px-4 py-2 gap-2.5', emblem: 'w-7 h-7', text: 'text-base' },
  lg: { container: 'px-5 py-2.5 gap-3', emblem: 'w-9 h-9', text: 'text-lg' },
};

export function TeamBadge({ team, size = 'md', showIcon = true, className }: TeamBadgeProps) {
  const config = teamConfig[team];
  const sizes = sizeStyles[size];
  const emblem = getTeamEmblem(team);

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl",
        "bg-gradient-to-r backdrop-blur-sm",
        config.bg,
        "border",
        config.border,
        "shadow-lg",
        config.glow,
        sizes.container,
        className
      )}
    >
      {showIcon && emblem && (
        <img
          src={emblem}
          alt={`Brasão Equipe ${team}`}
          className={cn(sizes.emblem, "object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]")}
        />
      )}
      <span className={cn("font-bold tracking-wider", config.color, sizes.text)}>
        EQUIPE {team}
      </span>
    </div>
  );
}

export function getTeamIcon(team: TeamName) {
  return teamConfig[team].icon;
}

export function getTeamColor(team: TeamName) {
  return teamConfig[team].color;
}
