import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import bgImage from '@/assets/restricted-dialog-bg.jpg';

interface ErrorDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'error' | 'warning' | 'auth' | 'password' | 'team';
  /** Nome da unidade à qual o agente está vinculado (exibido como brasão institucional). */
  unit?: string;
}

/* Professional SVG unit crest — institutional building emblem */
function UnitCrestSVG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="ucGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5d97a" />
          <stop offset="100%" stopColor="#8a6a2a" />
        </linearGradient>
      </defs>
      {/* base */}
      <rect x="6" y="36" width="36" height="3" fill="url(#ucGold)" opacity="0.85" />
      {/* pediment */}
      <path d="M6 20 L24 8 L42 20 Z" fill="none" stroke="url(#ucGold)" strokeWidth="1.6" strokeLinejoin="round" />
      {/* columns */}
      <g stroke="url(#ucGold)" strokeWidth="1.4">
        <line x1="12" y1="22" x2="12" y2="36" />
        <line x1="20" y1="22" x2="20" y2="36" />
        <line x1="28" y1="22" x2="28" y2="36" />
        <line x1="36" y1="22" x2="36" y2="36" />
      </g>
      {/* architrave */}
      <line x1="8" y1="22" x2="40" y2="22" stroke="url(#ucGold)" strokeWidth="1.6" />
      {/* star on pediment */}
      <circle cx="24" cy="15" r="1.6" fill="url(#ucGold)" />
    </svg>
  );
}

const HEADERS: Record<NonNullable<ErrorDialogProps['type']>, string> = {
  error: 'Falha no Sistema',
  warning: 'Protocolo de Segurança',
  auth: 'Autenticação Requerida',
  password: 'Credencial Inválida',
  team: 'Equipe Não Autorizada',
};

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    [880, 587].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.14);
      gain.gain.setValueAtTime(0, now + i * 0.14);
      gain.gain.linearRampToValueAtTime(0.09, now + i * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.35);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.4);
    });
  } catch {}
}

/* Professional SVG crest — heraldic shield with tactical geometry */
function CrestSVG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 140" className={className} aria-hidden>
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5d97a" />
          <stop offset="55%" stopColor="#c9a24c" />
          <stop offset="100%" stopColor="#7a5c1e" />
        </linearGradient>
        <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1f2b" />
          <stop offset="100%" stopColor="#05070c" />
        </linearGradient>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* shield body */}
      <path
        d="M60 6 L108 22 V70 C108 100 86 122 60 134 C34 122 12 100 12 70 V22 Z"
        fill="url(#steel)"
        stroke="url(#gold)"
        strokeWidth="2.2"
        filter="url(#glow)"
      />
      {/* inner border */}
      <path
        d="M60 14 L100 27 V70 C100 96 82 115 60 126 C38 115 20 96 20 70 V27 Z"
        fill="none"
        stroke="url(#gold)"
        strokeWidth="0.6"
        opacity="0.65"
      />
      {/* diagonal cross bars */}
      <path d="M32 46 L88 46" stroke="url(#gold)" strokeWidth="0.8" opacity="0.5" />
      <path d="M32 96 L88 96" stroke="url(#gold)" strokeWidth="0.8" opacity="0.5" />
      {/* central X (denied) */}
      <g stroke="url(#gold)" strokeWidth="3.4" strokeLinecap="round" filter="url(#glow)">
        <line x1="44" y1="58" x2="76" y2="88" />
        <line x1="76" y1="58" x2="44" y2="88" />
      </g>
      {/* stars */}
      <g fill="url(#gold)" opacity="0.9">
        <circle cx="60" cy="34" r="1.6" />
        <circle cx="46" cy="108" r="1.2" />
        <circle cx="74" cy="108" r="1.2" />
      </g>
    </svg>
  );
}

export function ErrorDialog({ open, onClose, title, message, type = 'warning', unit }: ErrorDialogProps) {
  useEffect(() => {
    if (open) playChime();
  }, [open]);

  const header = HEADERS[type];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          'p-0 gap-0 overflow-hidden border-0 max-w-md w-[92vw]',
          'rounded-2xl shadow-[0_25px_80px_-15px_rgba(0,0,0,0.9)]',
        )}
      >
        {/* Background image + overlays */}
        <div className="relative">
          <img
            src={bgImage}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/92 to-black/98" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,162,76,0.18),transparent_60%)]" />

          {/* Top hairline gold */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#c9a24c] to-transparent" />

          {/* Content */}
          <div className="relative px-7 pt-8 pb-7 text-center">
            {/* Section label */}
            <p className="text-[10px] tracking-[0.42em] font-mono text-[#c9a24c]/80 uppercase mb-5">
              {header}
            </p>

            {/* Crest */}
            <div className="flex justify-center mb-5">
              <CrestSVG className="w-20 h-24 drop-shadow-[0_6px_18px_rgba(201,162,76,0.35)]" />
            </div>

            {/* Title (serif) */}
            <h2
              className="text-3xl leading-tight text-white mb-1"
              style={{ fontFamily: '"Libre Baskerville", Georgia, serif', letterSpacing: '0.01em' }}
            >
              {title}
            </h2>

            {/* Gold underline */}
            <div className="mx-auto w-16 h-px bg-[#c9a24c]/70 my-4" />

            {/* Unit crest chip (institutional) */}
            {unit && (
              <div className="mx-auto mb-4 inline-flex items-center gap-2.5 rounded-full border border-[#c9a24c]/50 bg-black/45 px-4 py-1.5 shadow-[0_2px_10px_rgba(201,162,76,0.25)]">
                <UnitCrestSVG className="w-5 h-5 drop-shadow-[0_1px_2px_rgba(201,162,76,0.5)]" />
                <span
                  className="text-[10.5px] tracking-[0.32em] font-mono uppercase text-[#f0d98a]"
                  style={{ fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}
                >
                  Unidade · {unit}
                </span>
              </div>
            )}

            {/* Message */}
            <p
              className="text-[13.5px] leading-relaxed text-slate-200/90 whitespace-pre-line max-w-sm mx-auto"
              style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}
            >
              {message}
            </p>


            {/* Action */}
            <div className="mt-7 flex justify-center">
              <Button
                onClick={onClose}
                className={cn(
                  'h-11 px-10 rounded-full border border-[#c9a24c]/60',
                  'bg-gradient-to-b from-[#d4b060] to-[#8a6a2a] hover:from-[#e6c374] hover:to-[#a07d31]',
                  'text-black font-semibold tracking-[0.28em] text-[11px] uppercase',
                  'shadow-[0_6px_20px_-4px_rgba(201,162,76,0.55)] transition-all',
                )}
              >
                Entendido
              </Button>
            </div>

            {/* Footer meta */}
            <p className="mt-6 text-[9.5px] tracking-[0.35em] font-mono text-white/35 uppercase">
              PlantãoPro · Sistema Institucional
            </p>
          </div>

          {/* Bottom hairline gold */}
          <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#c9a24c] to-transparent" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
