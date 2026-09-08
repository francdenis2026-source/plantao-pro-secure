import { memo } from 'react';
import { cn } from '@/lib/utils';
import { useLowMotion } from '@/hooks/useLowMotion';

/**
 * Ampulheta tática — SVG único, padronizado, sem dependências externas.
 *
 * Otimizações:
 *  - Paths simplificados e reutilizáveis (não usa filtros nem SMIL <animate>,
 *    que são mais pesados em dispositivos lentos).
 *  - Animação por CSS (compositor GPU) usando `opacity`, evitando reflow.
 *  - Respeita `prefers-reduced-motion` E o hook `useLowMotion` do projeto
 *    (Safe Mode / detecção automática de aparelho fraco).
 *  - Tamanhos padronizados via prop `size`, para manter proporção idêntica
 *    em todos os chips e telas do PlantãoPro.
 *  - `memo` para evitar re-render quando o pai atualiza a cada tick.
 */

type Size = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<Size, string> = {
  sm: 'h-3 w-3',       // 12px — chips compactos
  md: 'h-3.5 w-3.5',   // 14px — padrão
  lg: 'h-4 w-4',       // 16px — headers
};

export interface HourglassSVGProps {
  size?: Size;
  className?: string;
  animated?: boolean;
}

function HourglassSVGImpl({ size = 'md', className, animated = true }: HourglassSVGProps) {
  const { lowMotion } = useLowMotion();
  const shouldAnimate = animated && !lowMotion;

  return (
    <svg
      viewBox="0 0 16 20"
      className={cn('inline-block align-[-2px] shrink-0', SIZE_CLASS[size], className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      role="img"
    >
      {/* Placas */}
      <line x1="2" y1="1.5" x2="14" y2="1.5" strokeWidth={1.6} />
      <line x1="2" y1="18.5" x2="14" y2="18.5" strokeWidth={1.6} />
      {/* Contorno do bulbo */}
      <path d="M3 1.5 C 3 6.5, 8 8.5, 8 10 C 8 11.5, 3 13.5, 3 18.5" />
      <path d="M13 1.5 C 13 6.5, 8 8.5, 8 10 C 8 11.5, 13 13.5, 13 18.5" />
      {/* Areia superior */}
      <path
        d="M4.2 3 L11.8 3 C 11.8 6, 8 8, 8 9.6 C 8 8, 4.2 6, 4.2 3 Z"
        fill="currentColor"
        stroke="none"
        className={shouldAnimate ? 'pp-hg-top' : undefined}
        opacity={shouldAnimate ? undefined : 0.85}
      />
      {/* Areia inferior */}
      <path
        d="M4.4 17 C 5 14.5, 6.6 13, 8 13 C 9.4 13, 11 14.5, 11.6 17 Z"
        fill="currentColor"
        stroke="none"
        className={shouldAnimate ? 'pp-hg-bot' : undefined}
        opacity={shouldAnimate ? undefined : 0.7}
      />
      {/* Fio de areia — apenas quando animado */}
      {shouldAnimate && (
        <line
          x1="8"
          y1="9.6"
          x2="8"
          y2="12.8"
          strokeWidth={0.8}
          className="pp-hg-stream"
        />
      )}
    </svg>
  );
}

export const HourglassSVG = memo(HourglassSVGImpl);
