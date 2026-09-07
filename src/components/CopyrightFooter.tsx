import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ShieldCheck, MapPin, Cpu, Radio, Lock } from 'lucide-react';
import iseAcreBadgeAsset from '@/assets/ise-acre-badge.png.asset.json';
import iseAcreBadgeWebpAsset from '@/assets/ise-acre-badge.webp.asset.json';
import { MadeInFeijoBadge } from './MadeInFeijoBadge';

import { DeveloperSignature } from './DeveloperSignature';

const iseAcreBadge = iseAcreBadgeAsset.url;
const iseAcreBadgeWebp = iseAcreBadgeWebpAsset.url;
interface CopyrightFooterProps {
  className?: string;
  compact?: boolean;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
}

/**
 * Rodapé institucional — Obsidian Steel
 * Tactical public-safety identity with steel cyan accents.
 */
export const CopyrightFooter = forwardRef<HTMLDivElement, CopyrightFooterProps>(
  ({ className, compact = false, leftSlot, rightSlot }, ref) => {

    const year = new Date().getFullYear();

    if (compact) {
      return (
        <div
          ref={ref}
          className={cn(
            'relative w-full overflow-hidden',
            'border-t border-primary/20',
            'bg-[linear-gradient(180deg,hsl(220_35%_6%/0.92)_0%,hsl(222_40%_4%/0.98)_100%)]',
            'backdrop-blur-md',
            className,
          )}
        >
          {/* Steel accent line */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--primary))_50%,transparent)] opacity-80"
          />
          <div className="relative mx-auto max-w-6xl px-3 sm:px-4 py-1 sm:py-2.5 flex flex-row items-center justify-between gap-2 sm:gap-3">
            {/* Left: Brand + Status + optional slot */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 font-sans">
              {leftSlot}
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.22em] text-foreground/85">
                PlantãoPro
              </span>
              <span className="hidden min-[480px]:inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm bg-card/40 ring-1 ring-border/40">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-success opacity-60" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-success" />
                </span>
                <span className="text-[9px] font-semibold tracking-[0.20em] uppercase text-success/90">
                  Operacional
                </span>
              </span>
              {/* Dot indicator apenas em telas pequenas */}
              <span className="inline-flex min-[480px]:hidden relative h-1.5 w-1.5" aria-label="Operacional">
                <span className="absolute inset-0 rounded-full bg-success opacity-60" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-success" />
              </span>

            </div>


            {/* Right: Meta + signature */}
            <div className="flex items-center gap-x-1.5 sm:gap-x-2 text-[9px] text-muted-foreground/75 tracking-[0.18em] uppercase whitespace-nowrap">
              <MadeInFeijoBadge inline size="sm" />
              <span className="hidden md:inline text-muted-foreground/30">·</span>
              <span className="hidden sm:inline-flex items-center gap-1">
                <Lock className="h-3 w-3 text-primary/60" />
                <span>LGPD · TLS 1.3</span>
              </span>
              <span className="hidden sm:inline text-muted-foreground/40">·</span>
              <span className="font-semibold text-foreground/80">v2.7</span>
              <span className="hidden min-[360px]:inline text-muted-foreground/40">·</span>
              <span className="hidden min-[360px]:inline">© {year}</span>
              {rightSlot}
            </div>
          </div>



        </div>
      );
    }


    return (
      <footer
        ref={ref}
        className={cn(
          'relative w-full overflow-hidden',
          'border-t border-border/60',
          'bg-[linear-gradient(180deg,hsl(220_32%_8%/0.95)_0%,hsl(222_38%_5%/0.98)_100%)]',
          'backdrop-blur-md',
          className,
        )}
      >
        {/* Top steel accent */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent_0%,hsl(var(--primary))_25%,hsl(var(--primary))_75%,transparent_100%)] opacity-85"
        />
        {/* Soft cyan halo */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-56 w-[55%] rounded-full bg-primary/8 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-5 py-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Institutional Identity */}
            <div className="md:col-span-5 flex items-center gap-3.5">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-md bg-primary/15 blur-md" />
                <div className="relative h-12 w-12 rounded-md ring-1 ring-primary/35 bg-gradient-to-br from-card to-background flex items-center justify-center p-1.5 shadow-[0_4px_14px_hsl(222_60%_2%/0.6)]">
                  <picture>
                    <source type="image/webp" srcSet={iseAcreBadgeWebp} />
                    <img
                      src={iseAcreBadge}
                      alt="Brasão ISE Acre"
                      width={96}
                      height={96}
                      loading="lazy"
                      decoding="async"
                      className="max-h-full max-w-full h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                    />
                  </picture>
                </div>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-bold tracking-[0.24em] text-primary uppercase">
                  Instituto Socioeducativo
                </span>
                <span className="text-[13px] font-bold text-foreground tracking-wide font-serif">
                  PlantãoPro · Comando Tático
                </span>
                <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-2.5 w-2.5" />
                  Governo do Estado do Acre
                </span>
              </div>
            </div>

            {/* Center: operational status */}
            <div className="md:col-span-3 flex md:justify-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-card/60 ring-1 ring-border/60">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-success opacity-60" />
                  <span className="relative h-2 w-2 rounded-full bg-success" />
                </span>
                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-success/95">
                  Sistema Ativo
                </span>
                <Radio className="h-3 w-3 text-success/70" />
              </div>
            </div>

            {/* Version credit */}
            <div className="md:col-span-4 flex flex-col items-start md:items-end leading-tight gap-1">
              <div className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-primary/80" />
                <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70 font-semibold">
                  Sistema Institucional
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded-sm text-[9px] font-bold tracking-widest bg-primary/12 text-primary ring-1 ring-primary/30">
                  v2.7
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground/60 tracking-wide">
                Feijó · AC · © {year} PlantãoPro
              </p>
            </div>

          </div>

          {/* Bottom hairline */}
          <div className="mt-4 pt-3 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-[9px] text-muted-foreground/55">
            <span className="tracking-wider uppercase flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-primary/60" />
              Uso restrito · LGPD compliant
            </span>
            <DeveloperSignature className="order-last sm:order-none" />
            <span className="flex items-center gap-1.5 tracking-wider uppercase">
              <ShieldCheck className="h-3 w-3 text-primary/70" />
              TLS 1.3 · AES-256 · RLS
            </span>
          </div>
        </div>
      </footer>
    );
  },
);

CopyrightFooter.displayName = 'CopyrightFooter';
