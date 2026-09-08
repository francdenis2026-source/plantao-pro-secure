import { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Reusable SVG confirmation dialog for the Rounds tool.
 *
 * Standard behavior:
 *  - Never closes on ESC.
 *  - Never closes on outside click / pointer-down-outside / focus-outside.
 *  - Native "X" close button is hidden.
 *  - The ONLY way out is one of the two action buttons.
 *
 * Visual language:
 *  - Pure SVG icon (no icon-font dependency), with radial gradient + soft shadow
 *    so it reads as a subtle 3D emblem consistent with the team hero.
 *  - Two-button footer: primary "safe" action (continue/acknowledge) uses the
 *    accent color; secondary "destructive" action uses the neutral slate style.
 */

export type ConfirmVariant = 'exit' | 'alarm' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Small mono kicker above the title, e.g. "CONFIRMAÇÃO" */
  kicker?: string;
  title: string;
  description?: ReactNode;
  /** Accent color (hex or css color). Drives the icon gradient and primary button. */
  accent: string;
  variant?: ConfirmVariant;
  /** Primary (safe) button — usually "Continuar" / "Ciente". */
  primaryLabel: string;
  onPrimary: () => void;
  /** Secondary (destructive) button — optional. When omitted only the primary is shown. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Extra content between description and buttons (e.g. animated bell). */
  children?: ReactNode;
}

function ConfirmIcon({ variant, color }: { variant: ConfirmVariant; color: string }) {
  const gId = `cd-${variant}-g`;
  const hId = `cd-${variant}-h`;
  const filter = `drop-shadow(0 2px 6px ${color}44)`;

  const defs = (
    <defs>
      <radialGradient id={gId} cx="35%" cy="28%" r="75%">
        <stop offset="0%" stopColor={color} stopOpacity="0.9" />
        <stop offset="55%" stopColor={color} stopOpacity="0.35" />
        <stop offset="100%" stopColor="#020617" />
      </radialGradient>
      <radialGradient id={hId} cx="35%" cy="22%" r="40%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
    </defs>
  );

  const common = {
    viewBox: '0 0 48 48',
    className: 'h-9 w-9 shrink-0',
    style: { filter },
    'aria-hidden': true as const,
  };


  if (variant === 'alarm') {
    return (
      <svg {...common}>
        {defs}
        <circle cx="24" cy="24" r="20" fill={`url(#${gId})`} stroke={color} strokeOpacity="0.7" strokeWidth="1.2" />
        <path
          d="M24 11c-4.4 0-8 3.6-8 8v5l-2.4 3.4A1.2 1.2 0 0 0 14.6 29h18.8a1.2 1.2 0 0 0 1-1.8L32 24v-5c0-4.4-3.6-8-8-8Z"
          fill="#0b0f17"
          fillOpacity="0.45"
          stroke={color}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M21 32a3 3 0 0 0 6 0" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        <ellipse cx="20" cy="18" rx="6" ry="3" fill={`url(#${hId})`} />
      </svg>
    );
  }

  // exit / warning / info — shield with exclamation
  return (
    <svg {...common}>
      {defs}
      <path
        d="M24 4 L42 11 V26 C42 36 34 43 24 46 C14 43 6 36 6 26 V11 Z"
        fill={`url(#${gId})`}
        stroke={color}
        strokeOpacity="0.8"
        strokeWidth="1.2"
      />
      <path d="M24 4 L42 11 V19 C42 21 34 23 24 23 C14 23 6 21 6 19 V11 Z" fill={`url(#${hId})`} />
      <path d="M24 16 V28 M24 33 V34.2" stroke="#0b0f17" strokeWidth="4" strokeLinecap="round" opacity="0.4" />
      <path d="M24 16 V28 M24 33 V34.2" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  kicker = 'Confirmação',
  title,
  description,
  accent,
  variant = 'exit',
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[22rem] bg-slate-950 border border-slate-700/70 p-3.5 gap-2.5 [&>button.absolute]:hidden"
        style={{ borderColor: `${accent}55`, boxShadow: `0 10px 40px -20px ${accent}aa` }}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-0">
          <div className="flex items-start gap-2.5">
            <ConfirmIcon variant={variant} color={accent} />
            <div className="min-w-0 pt-0.5">
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500 leading-tight">
                {kicker}
              </div>
              <DialogTitle className="font-sans text-[13.5px] font-semibold tracking-tight text-slate-100 leading-snug mt-0.5">
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription className="text-[11.5px] text-slate-400 mt-1 leading-snug">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {children && <div className="flex flex-col items-center gap-1.5">{children}</div>}

        <div className={cn('grid gap-2', secondaryLabel ? 'grid-cols-2' : 'grid-cols-1')}>
          <button
            type="button"
            onClick={onPrimary}
            className="inline-flex items-center justify-center gap-1.5 h-8 rounded-md border font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] transition-colors"
            style={{
              borderColor: `${accent}80`,
              backgroundColor: `${accent}1a`,
              color: accent,
            }}
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden>
              <path
                d="M5 12l5 5L20 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {primaryLabel}
          </button>

          {secondaryLabel && onSecondary && (
            <button
              type="button"
              onClick={onSecondary}
              className="inline-flex items-center justify-center gap-1.5 h-8 rounded-md border border-slate-700/70 bg-slate-900/60 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-300 hover:text-slate-100 hover:border-slate-500 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden>
                <path
                  d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 8l-4 4 4 4M6 12h11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {secondaryLabel}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

