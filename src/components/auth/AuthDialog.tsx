import { ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import logoShieldAsset from '@/assets/ise-acre-badge.png.asset.json';
import logoShieldWebpAsset from '@/assets/ise-acre-badge.webp.asset.json';
const logoShield = logoShieldAsset.url;
const logoShieldWebp = logoShieldWebpAsset.url;
import { getTeamPoster, getTeamEmblem, getTeamColors } from '@/lib/teamAssets';

type AuthDialogVariant = 'agent' | 'master' | 'admin' | 'register' | 'check';
type TeamName = 'ALFA' | 'BRAVO' | 'CHARLIE' | 'DELTA';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: AuthDialogVariant;
  title: string;
  subtitle?: string;
  children: ReactNode;
  icon?: ReactNode;
  teamBadge?: ReactNode;
  /** When provided, renders the team-branded hero (poster + emblem + team colors). */
  team?: TeamName | string | null;
}

const variantStyles = {
  agent: {
    border: 'border-blue-500/50',
    glow: 'shadow-blue-500/20',
    accent: 'from-blue-600 via-blue-500 to-cyan-500',
    logoBg: 'from-blue-500/20 to-cyan-500/10',
    headerBg: 'from-blue-900/40 via-blue-800/20 to-transparent',
    titleColor: 'text-blue-100',
    subtitleColor: 'text-blue-300/80',
    decorColor: 'bg-blue-500',
  },
  master: {
    border: 'border-amber-500/50',
    glow: 'shadow-amber-500/25',
    accent: 'from-amber-500 via-orange-500 to-yellow-500',
    logoBg: 'from-amber-500/25 to-orange-500/15',
    headerBg: 'from-amber-900/40 via-orange-900/20 to-transparent',
    titleColor: 'text-amber-100',
    subtitleColor: 'text-amber-300/80',
    decorColor: 'bg-amber-500',
  },
  admin: {
    border: 'border-indigo-500/50',
    glow: 'shadow-indigo-500/20',
    accent: 'from-indigo-500 via-purple-500 to-violet-500',
    logoBg: 'from-indigo-500/20 to-purple-500/10',
    headerBg: 'from-indigo-900/40 via-purple-900/20 to-transparent',
    titleColor: 'text-indigo-100',
    subtitleColor: 'text-indigo-300/80',
    decorColor: 'bg-indigo-500',
  },
  register: {
    border: 'border-cyan-500/50',
    glow: 'shadow-cyan-500/20',
    accent: 'from-cyan-500 via-teal-500 to-emerald-500',
    logoBg: 'from-cyan-500/20 to-teal-500/10',
    headerBg: 'from-cyan-900/40 via-teal-900/20 to-transparent',
    titleColor: 'text-cyan-100',
    subtitleColor: 'text-cyan-300/80',
    decorColor: 'bg-cyan-500',
  },
  check: {
    border: 'border-emerald-500/50',
    glow: 'shadow-emerald-500/20',
    accent: 'from-emerald-500 via-green-500 to-teal-500',
    logoBg: 'from-emerald-500/20 to-green-500/10',
    headerBg: 'from-emerald-900/40 via-green-900/20 to-transparent',
    titleColor: 'text-emerald-100',
    subtitleColor: 'text-emerald-300/80',
    decorColor: 'bg-emerald-500',
  },
};

// Unified tactical pattern overlay — same subtle diamond grid for every team,
// tinted with the team's primary color at a light, consistent opacity.
const hexToRgb = (hex: string): string => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `${r},${g},${b}`;
};
const buildTeamPattern = (primaryHex: string): string => {
  const rgb = hexToRgb(primaryHex);
  const stroke = `rgba(${rgb},0.10)`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><path d='M0 20L20 0L40 20L20 40Z' fill='none' stroke='${stroke}' stroke-width='0.6'/></svg>`;
  return `url("data:image/svg+xml;utf8,${svg}")`;
};

export function AuthDialog({
  open,
  onOpenChange,
  variant,
  title,
  subtitle,
  children,
  icon,
  teamBadge,
  team,
}: AuthDialogProps) {
  const styles = variantStyles[variant];
  const teamKey = team ? String(team).toUpperCase() : null;
  const teamPoster = teamKey ? getTeamPoster(teamKey) : null;
  const teamEmblem = teamKey ? getTeamEmblem(teamKey) : null;
  const teamColor = teamKey ? getTeamColors(teamKey) : null;
  const teamPattern = teamColor ? buildTeamPattern(teamColor.primary) : null;
  const teamBranded = Boolean(teamPoster && teamColor);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[94vw] p-0 gap-0 overflow-hidden",
          variant === 'register' ? "max-w-[480px]" : "max-w-[440px]",
          "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
          // outline removido — sem border-2 nem ring duplicado
          "border-0",
          "shadow-2xl",
          !teamBranded && styles.glow,
          // Instant open/close — no zoom/slide/fade delays
          "!duration-0 data-[state=open]:!animate-none data-[state=closed]:!animate-none",
          // Bounded height + internal flex so hero stays fixed and body scrolls
          "flex flex-col max-h-[92dvh] sm:max-h-[88vh]"
        )}
        style={teamBranded && teamColor ? {
          boxShadow: `0 25px 60px -12px ${teamColor.glow}`,
        } : undefined}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{subtitle || title}</DialogDescription>

        {/* Top accent bar (única linha superior) */}
        <div
          className={cn("h-1 w-full shrink-0", !teamBranded && "bg-gradient-to-r", !teamBranded && styles.accent)}
          style={teamBranded && teamColor ? {
            background: `linear-gradient(90deg, ${teamColor.secondary}, ${teamColor.primary}, ${teamColor.secondary})`,
          } : undefined}
        />



        {/* HERO — team-branded (compact professional) */}
        {teamBranded && teamPoster ? (
          <div
            className={cn(
              "relative w-full overflow-hidden bg-slate-950 shrink-0",
              variant === 'register'
                ? "aspect-[16/5] sm:aspect-[16/5]"
                : "aspect-[16/9] sm:aspect-[16/7] md:aspect-[16/6]"
            )}
          >
            <img
              src={teamPoster}
              alt={`Equipe ${teamKey}`}
              className="absolute inset-0 h-full w-full object-cover object-[center_25%] sm:object-[center_30%]"
              style={{ filter: 'contrast(1.06) saturate(0.98) brightness(0.9)' }}
            />

            {/* Vinheta noir + gradiente base para legibilidade */}
            <div className="absolute inset-0 pointer-events-none"
                 style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 40%, rgba(2,6,23,0.55) 100%)' }} />
            <div className="absolute inset-x-0 bottom-0 h-3/4 pointer-events-none"
                 style={{ background: `linear-gradient(180deg, transparent 0%, rgba(2,6,23,0.65) 55%, rgba(2,6,23,0.98) 100%)` }} />
            <div className="absolute left-0 top-0 bottom-0 w-[3px]"
                 style={{ background: teamColor!.primary, opacity: 0.7 }} />

            {/* Top status row */}
            <div className="absolute top-2 sm:top-2.5 inset-x-3 sm:inset-x-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="h-1.5 w-1.5 rounded-full shrink-0"
                     style={{ background: teamColor!.primary }} />
                <span className="text-[9px] sm:text-[10px] tracking-[0.24em] sm:tracking-[0.28em] font-mono font-semibold text-white/75 uppercase truncate">
                  Canal Seguro
                </span>
              </div>
              <span className="hidden sm:inline text-[9px] sm:text-[10px] tracking-[0.2em] font-mono text-white/45 shrink-0">CLASSIFIED</span>
            </div>

            {/* Emblem + title — horizontal compact */}
            <div className="absolute bottom-0 inset-x-0 px-3 sm:px-4 pb-2.5 sm:pb-3 flex items-end gap-2.5 sm:gap-3">
              {teamEmblem && (
                <img src={teamEmblem} alt=""
                  className="h-9 w-9 sm:h-11 sm:w-11 md:h-12 md:w-12 object-contain shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[9px] sm:text-[10px] tracking-[0.28em] sm:tracking-[0.32em] font-mono font-bold uppercase leading-none"
                     style={{ color: teamColor!.primary }}>
                  Equipe {teamKey}
                </div>
                <h2 className="text-[15px] sm:text-lg md:text-xl font-bold tracking-tight text-white leading-tight mt-1 font-stencil line-clamp-1">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-[10px] sm:text-[11px] text-white/70 leading-snug mt-0.5 line-clamp-2 sm:line-clamp-1">{subtitle}</p>
                )}
              </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 h-px"
                 style={{ background: `linear-gradient(90deg, transparent, ${teamColor!.primary}, transparent)` }} />
          </div>
        ) : (
          <>
            {/* Legacy header (non-team dialogs) */}
            <div className={cn("relative px-6 pt-8 pb-6 bg-gradient-to-b shrink-0", styles.headerBg)}>

              <div className="absolute top-4 right-4 flex gap-1.5">
                <div className={cn("w-1.5 h-1.5 rounded-full", styles.decorColor)} />
                <div className={cn("w-1.5 h-1.5 rounded-full opacity-60", styles.decorColor)} />
                <div className={cn("w-1.5 h-1.5 rounded-full opacity-30", styles.decorColor)} />
              </div>
              <div className="flex justify-center mb-5">
                <div className={cn("p-4 rounded-2xl bg-gradient-to-br backdrop-blur-sm",
                  styles.logoBg, "border border-white/10 shadow-lg")}>
                  <div className="relative aspect-square h-16 w-16 flex items-center justify-center flex-shrink-0">
                    <picture>
                      <source type="image/webp" srcSet={logoShieldWebp} />
                      <img src={logoShield} alt="Plantão Pro" width={128} height={128} loading="eager" decoding="async" className="max-h-full max-w-full h-full w-full object-contain drop-shadow-lg" />
                    </picture>
                  </div>
                </div>
              </div>
              {teamBadge && (
                <div className="flex justify-center mb-4">{teamBadge}</div>
              )}
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-3">
                  {icon && (
                    <div className={cn("p-2.5 rounded-xl bg-gradient-to-br", styles.logoBg, "border border-white/10")}>
                      {icon}
                    </div>
                  )}
                  <h2 className={cn("text-2xl font-bold tracking-tight", styles.titleColor)}>
                    {title}
                  </h2>
                </div>
                {subtitle && (
                  <p className={cn("text-base", styles.subtitleColor)}>{subtitle}</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Separator */}
        <div className="relative h-px bg-slate-800 shrink-0">
          <div
            className="absolute inset-0 opacity-60"
            style={teamBranded && teamColor ? {
              background: `linear-gradient(90deg, transparent, ${teamColor.primary}, transparent)`,
            } : undefined}
          >
            {!teamBranded && (
              <div className={cn(
                "absolute inset-0 bg-gradient-to-r from-transparent via-current to-transparent opacity-50",
                variant === 'agent' && "text-blue-500",
                variant === 'master' && "text-amber-500",
                variant === 'admin' && "text-indigo-500",
                variant === 'register' && "text-cyan-500",
                variant === 'check' && "text-emerald-500"
              )} />
            )}
          </div>
        </div>

        {/* Scrollable content region — hero stays fixed above. Scrollbar hidden but scroll works. */}
        <div
          className={cn(
            "flex-1 min-h-0 overflow-y-auto overscroll-contain",
            "[&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]",
            variant === 'register' ? "px-4 py-4 sm:px-6 sm:py-5" : "px-6 py-6",
            "[&_label]:text-[11px] [&_label]:tracking-[0.14em] [&_label]:uppercase [&_label]:font-semibold [&_label]:text-white/75 [&_input]:h-11 [&_input]:text-[14px]"
          )}
          style={teamBranded && teamColor ? ({
            ['--team-primary' as string]: teamColor.primary,
            ['--team-secondary' as string]: teamColor.secondary,
            ['--team-ring' as string]: teamColor.ring,
            ['--team-hover' as string]: teamColor.hover,
            ['--team-on-primary' as string]: teamColor.onPrimary,
            ['--team-glow' as string]: teamColor.glow,
          } as React.CSSProperties) : undefined}
        >
          {children}
        </div>

        {/* Bottom accent */}
        <div
          className={cn("h-1 w-full opacity-70 shrink-0", !teamBranded && "bg-gradient-to-r", !teamBranded && styles.accent)}
          style={teamBranded && teamColor ? {
            background: `linear-gradient(90deg, ${teamColor.secondary}, ${teamColor.primary}, ${teamColor.secondary})`,
          } : undefined}
        />

      </DialogContent>
    </Dialog>
  );
}

// shimmer keyframes injected once
const shimmerKeyframes = `
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
`;

if (typeof document !== 'undefined') {
  if (!document.head.querySelector('[data-shimmer-animation]')) {
    const style = document.createElement('style');
    style.textContent = shimmerKeyframes;
    style.setAttribute('data-shimmer-animation', 'true');
    document.head.appendChild(style);
  }
}
