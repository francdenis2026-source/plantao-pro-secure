import { memo } from 'react';

type TeamKey = 'ALFA' | 'BRAVO' | 'CHARLIE' | 'DELTA' | string;

interface Props {
  team: TeamKey;
  color: string;
  size?: number;
  className?: string;
  title?: string;
}

/**
 * TeamGlyph — SVG compacto e distinto por equipe.
 * ALFA=Escudo · BRAVO=Espada · CHARLIE=Alvo · DELTA=Raio.
 * Otimizado para header bars: currentColor + escala fluida, sem esmagar o layout.
 */
function TeamGlyphInner({ team, color, size = 14, className, title }: Props) {
  const key = (team || '').toUpperCase();
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': title ? undefined : true,
    role: title ? 'img' : undefined,
  };
  const label = title ?? `Equipe ${key}`;
  switch (key) {
    case 'ALFA': // Escudo
      return (
        <svg {...common} aria-label={label}>
          <path d="M12 2.5 4.5 5v6.2c0 4.7 3.2 8.5 7.5 10.3 4.3-1.8 7.5-5.6 7.5-10.3V5L12 2.5Z" />
          <path d="M12 8v7" opacity="0.55" />
        </svg>
      );
    case 'BRAVO': // Espada
      return (
        <svg {...common} aria-label={label}>
          <path d="m4 20 4-4" />
          <path d="M20.5 3.5 12 12l-2 4 4-2 8.5-8.5-2-2Z" />
          <path d="m14 12 2 2" opacity="0.6" />
        </svg>
      );
    case 'CHARLIE': // Alvo
      return (
        <svg {...common} aria-label={label}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" opacity="0.75" />
          <circle cx="12" cy="12" r="1.6" fill={color} stroke="none" />
        </svg>
      );
    case 'DELTA': // Raio
      return (
        <svg {...common} aria-label={label}>
          <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill={color} fillOpacity="0.15" />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-label={label}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

export const TeamGlyph = memo(TeamGlyphInner);
export default TeamGlyph;
