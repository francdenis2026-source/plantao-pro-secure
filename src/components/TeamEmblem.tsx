import { cn } from '@/lib/utils';
import { getTeamEmblem } from '@/lib/teamAssets';

export type TeamEmblemSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface TeamEmblemProps {
  team: string | null | undefined;
  size?: TeamEmblemSize;
  className?: string;
  withGlow?: boolean;
}

// Unified, app-wide standard sizing for team emblems.
// Always 1:1 aspect ratio, consistent drop shadow, no extra margins.
const SIZE_MAP: Record<TeamEmblemSize, string> = {
  xs: 'w-5 h-5',
  sm: 'w-7 h-7',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

export function TeamEmblem({ team, size = 'md', className, withGlow = false }: TeamEmblemProps) {
  const emblem = getTeamEmblem(team ?? null);
  if (!emblem) return null;

  return (
    <img
      src={emblem}
      alt={`Brasão Equipe ${team}`}
      loading="lazy"
      decoding="async"
      className={cn(
        SIZE_MAP[size],
        'object-contain shrink-0 aspect-square select-none',
        'drop-shadow-[0_2px_4px_rgba(0,0,0,0.55)]',
        withGlow && 'drop-shadow-[0_0_12px_rgba(245,158,11,0.45)]',
        className,
      )}
      draggable={false}
    />
  );
}
