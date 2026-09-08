import { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import appLogoUrl from '@/assets/logo-plantaopro-app.png';

/**
 * Logomarca do aplicativo PlantãoPro — escudo azul com estrela dourada.
 * É a marca do PRODUTO (favicon, ícone PWA, cabeçalho, compartilhamento),
 * distinta do brasão institucional do ISE/AC (`BrasaoSentinela`), que
 * continua representando a instituição dentro do sistema.
 */
export function AppLogo({
  size = 40,
  className,
  style,
  title = 'PlantãoPro',
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  return (
    <img
      src={appLogoUrl}
      alt={title}
      title={title}
      width={size}
      height={size}
      loading="eager"
      decoding="async"
      draggable={false}
      className={cn('select-none rounded-[22%] object-contain', className)}
      style={{ width: size, height: size, ...style }}
    />
  );
}

export default AppLogo;
