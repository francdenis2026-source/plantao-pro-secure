import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { BrasaoSentinela } from '@/components/BrasaoSentinela';
import { ShieldAlert, Building2 } from 'lucide-react';
import bgImage from '@/assets/comando-operacional-cover.webp';

interface ErrorDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'error' | 'warning' | 'auth' | 'password' | 'team';
  /** Nome da unidade à qual o agente está vinculado (exibido como chip institucional). */
  unit?: string;
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

/**
 * Diálogo institucional de bloqueio/restrição de acesso — usado para conta
 * desativada, congelada, licença expirada, cadastro incompleto e, o caso
 * mais comum, agente tentando entrar pela equipe errada.
 *
 * Fundo: sala de comando genérica (sem rostos, sem insígnias de nenhum
 * país) — antes usava uma foto de operador com bandeira dos EUA no ombro,
 * fora de contexto para uma instituição do Acre. Paleta alinhada ao azul
 * da marca (--primary) em vez do dourado heráldico usado antes, e o
 * brasão é o mesmo BrasaoSentinela usado no resto do app, não um escudo
 * genérico desenhado à parte.
 */
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
          <div className="absolute inset-0 bg-gradient-to-b from-[#050a18]/88 via-[#050a18]/94 to-[#050a18]/98" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.22),transparent_60%)]" />

          {/* Top hairline */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

          {/* Content */}
          <div className="relative px-7 pt-8 pb-7 text-center">
            {/* Section label */}
            <p className="flex items-center justify-center gap-1.5 text-[10px] tracking-[0.4em] font-mono text-primary/85 uppercase mb-5">
              <ShieldAlert className="h-3 w-3" strokeWidth={2.5} />
              {header}
            </p>

            {/* Brand mark */}
            <div className="flex justify-center mb-5">
              <BrasaoSentinela size={64} title="PlantãoPro" className="drop-shadow-[0_6px_18px_hsl(var(--primary)/0.4)]" />
            </div>

            {/* Title (serif) */}
            <h2
              className="text-3xl leading-tight text-white mb-1"
              style={{ fontFamily: '"Libre Baskerville", Georgia, serif', letterSpacing: '0.01em' }}
            >
              {title}
            </h2>

            {/* Underline */}
            <div className="mx-auto w-16 h-px bg-primary/60 my-4" />

            {/* Unit chip (institutional) */}
            {unit && (
              <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-black/40 px-4 py-1.5 shadow-[0_2px_10px_hsl(var(--primary)/0.2)]">
                <Building2 className="h-3.5 w-3.5 text-primary" strokeWidth={2.2} />
                <span
                  className="text-[10.5px] tracking-[0.3em] font-mono uppercase text-primary/90"
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
                  'h-11 px-10 rounded-full',
                  'font-semibold tracking-[0.28em] text-[11px] uppercase',
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

          {/* Bottom hairline */}
          <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
