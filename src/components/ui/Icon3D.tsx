import { ComponentType, useState } from 'react';
import type { LucideProps } from 'lucide-react';
import {
  Pencil,
  MessageSquare,
  Lock,
  Unlock,
  Bell,
  LogOut,
  RefreshCw,
  Gift,
  User,
  Users,
  Shield,
  Calendar,
  Clock,
  Building2,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 3D asset imports (bundled + hashed by Vite, served with long cache)
// Each icon has PNG (fallback) + WebP (preferred, ~70% smaller).
import editAsset_ptr from '@/assets/icon-3d-edit.png.asset.json';
const editAsset = (editAsset_ptr as {url:string}).url;
import editWebp from '@/assets/icon-3d-edit.webp';
import messageAsset from '@/assets/icon-3d-message.png';
import messageWebp from '@/assets/icon-3d-message.webp';
import lockAsset_ptr from '@/assets/icon-3d-lock.png.asset.json';
const lockAsset = (lockAsset_ptr as {url:string}).url;
import lockWebp from '@/assets/icon-3d-lock.webp';
import bellAsset_ptr from '@/assets/icon-3d-bell.png.asset.json';
const bellAsset = (bellAsset_ptr as {url:string}).url;
import bellWebp from '@/assets/icon-3d-bell.webp';
import logoutAsset from '@/assets/icon-3d-logout.png';
import logoutWebp from '@/assets/icon-3d-logout.webp';
import refreshAsset from '@/assets/icon-3d-refresh.png';
import refreshWebp from '@/assets/icon-3d-refresh.webp';
import giftAsset_ptr from '@/assets/icon-3d-gift.png.asset.json';
const giftAsset = (giftAsset_ptr as {url:string}).url;
import giftWebp from '@/assets/icon-3d-gift.webp';
import userAsset_ptr from '@/assets/icon-3d-user.png.asset.json';
const userAsset = (userAsset_ptr as {url:string}).url;
import userWebp from '@/assets/icon-3d-user.webp';
import typographyAsset from '@/assets/icon-3d-typography.png';
import typographyWebp from '@/assets/icon-3d-typography.webp';
import teamAsset_ptr from '@/assets/icon3d-team.png.asset.json';
const teamAsset = (teamAsset_ptr as {url:string}).url;
import teamWebp from '@/assets/icon3d-team.webp';
import shieldAsset_ptr from '@/assets/icon3d-shield.png.asset.json';
const shieldAsset = (shieldAsset_ptr as {url:string}).url;
import shieldWebp from '@/assets/icon3d-shield.webp';
import calendarAsset_ptr from '@/assets/icon3d-calendar.png.asset.json';
const calendarAsset = (calendarAsset_ptr as {url:string}).url;
import calendarWebp from '@/assets/icon3d-calendar.webp';
import clockAsset_ptr from '@/assets/icon3d-clock.png.asset.json';
const clockAsset = (clockAsset_ptr as {url:string}).url;
import clockWebp from '@/assets/icon3d-clock.webp';
import buildingAsset_ptr from '@/assets/icon3d-building.png.asset.json';
const buildingAsset = (buildingAsset_ptr as {url:string}).url;
import buildingWebp from '@/assets/icon3d-building.webp';

/** Semantic icon names → { asset, webp, Lucide fallback } */
export const ICON_3D_MAP = {
  edit: { src: editAsset, webp: editWebp, fallback: Pencil },
  message: { src: messageAsset, webp: messageWebp, fallback: MessageSquare },
  lock: { src: lockAsset, webp: lockWebp, fallback: Lock },
  unlock: { src: lockAsset, webp: lockWebp, fallback: Unlock },
  bell: { src: bellAsset, webp: bellWebp, fallback: Bell },
  logout: { src: logoutAsset, webp: logoutWebp, fallback: LogOut },
  refresh: { src: refreshAsset, webp: refreshWebp, fallback: RefreshCw },
  gift: { src: giftAsset, webp: giftWebp, fallback: Gift },
  user: { src: userAsset, webp: userWebp, fallback: User },
  typography: { src: typographyAsset, webp: typographyWebp, fallback: Type },
  team: { src: teamAsset, webp: teamWebp, fallback: Users },
  shield: { src: shieldAsset, webp: shieldWebp, fallback: Shield },
  calendar: { src: calendarAsset, webp: calendarWebp, fallback: Calendar },
  clock: { src: clockAsset, webp: clockWebp, fallback: Clock },
  building: { src: buildingAsset, webp: buildingWebp, fallback: Building2 },
} as const satisfies Record<string, { src: string; webp: string; fallback: ComponentType<LucideProps> }>;

export type Icon3DName = keyof typeof ICON_3D_MAP;

interface Icon3DBaseProps {
  /** Accessible label. Empty = decorative. */
  alt?: string;
  /** Size in px. Default 24. Use 16 in compact table buttons. */
  size?: number;
  className?: string;
  fallbackColor?: string;
}

interface Icon3DSemanticProps extends Icon3DBaseProps {
  /** Semantic name (preferred). Ex: `<Icon3D name="edit" />` */
  name: Icon3DName;
  src?: never;
  fallback?: never;
}

interface Icon3DLegacyProps extends Icon3DBaseProps {
  name?: never;
  /** Legacy: direct PNG URL. Prefer `name` when the icon exists in ICON_3D_MAP. */
  src: string;
  /** Legacy: Lucide fallback when using `src`. */
  fallback?: ComponentType<LucideProps>;
}

/**
 * Discriminated union — either use semantic `name` OR legacy `src`.
 * TypeScript errors if both are passed, preventing drift back to `src`
 * when a semantic alias exists in ICON_3D_MAP.
 */
export type Icon3DProps = Icon3DSemanticProps | Icon3DLegacyProps;

/**
 * Icon3D — 3D isometric asset with semantic mapping.
 * - Native lazy loading (`loading="lazy"` + `decoding="async"`)
 * - Async decode + skeleton overlay
 * - Lucide fallback on error
 * - Perfectly centered for use inside compact buttons
 */
export function Icon3D({
  alt = '',
  size = 24,
  className,
  fallbackColor,
  ...rest
}: Icon3DProps) {
  const name = (rest as Icon3DSemanticProps).name;
  const rawSrc = (rest as Icon3DLegacyProps).src;
  const rawFallback = (rest as Icon3DLegacyProps).fallback;

  const mapped = name ? ICON_3D_MAP[name] : undefined;
  const src = mapped?.src ?? rawSrc;
  const webp = mapped?.webp;
  const Fallback = mapped?.fallback ?? rawFallback;

  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  if (!src || status === 'error') {
    if (!Fallback) return null;
    return (
      <Fallback
        aria-hidden={alt ? undefined : true}
        aria-label={alt || undefined}
        width={size}
        height={size}
        color={fallbackColor}
        className={cn('inline-block shrink-0 align-middle', className)}
      />
    );
  }

  const dim = { width: size, height: size };

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center align-middle leading-none',
        className,
      )}
      style={dim}
    >
      {status === 'loading' && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-md bg-amber-500/20 animate-pulse"
        />
      )}
      <picture>
        {webp && <source srcSet={webp} type="image/webp" />}
        <img
          src={src}
          alt={alt}
          aria-hidden={alt ? undefined : true}
          loading="lazy"
          decoding="async"
          width={size}
          height={size}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={cn(
            'block object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] transition-opacity duration-300',
            status === 'loaded' ? 'opacity-100' : 'opacity-0',
          )}
          style={dim}
        />
      </picture>
    </span>
  );
}

/**
 * Icon3DAction — compact standardized variant for row/table action buttons.
 * Fixed size 16, align-middle, leading-none. Use in every compact <Button>
 * to guarantee visual consistency across Dashboard, Master, and unit tables.
 */
export function Icon3DAction(props: Omit<Icon3DProps, 'size'>) {
  return (
    <Icon3D
      {...(props as Icon3DProps)}
      size={16}
      className={cn('align-middle leading-none', props.className)}
    />
  );
}
