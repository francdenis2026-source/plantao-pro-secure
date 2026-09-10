import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { BrasaoSentinela } from '@/components/BrasaoSentinela';
import { ShieldAlert, Building2, UserRound } from 'lucide-react';
import bgImage from '@/assets/hero-command.webp';

interface ErrorDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'error' | 'warning' | 'auth' | 'password' | 'team';
  /** Nome da unidade à qual o agente está vinculado (exibido como chip institucional). */
  unit?: string;
  /** Nome do agente que motivou o bloqueio (ex.: tentativa de login na equipe errada). */
  agentName?: string;
  /** Equipe real à qual o agente pertence — exibida em destaque junto ao nome. */
  agentTeam?: string;
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
 * Fundo: centro de operações real (equipe trabalhando de costas, sem
 * rostos visíveis, sem insígnias de nenhum país e sem nome de equipe
 * impresso na própria foto — genérico o suficiente pra qualquer contexto
 * de bloqueio, não só "equipe errada").
 *
 * Hierarquia: o nome do agente e a equipe a que ele realmente pertence
 * ficam em um bloco de destaque próprio (não diluídos dentro do parágrafo
 * de texto corrido), e a mensagem — o motivo do bloqueio — vem logo
 * abaixo em texto maior e mais forte, como informação principal da tela.
 */
export function ErrorDialog({ open, onClose, title, message, type = 'warning', unit, agentName, agentTeam }: ErrorDialogProps) {
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
            className="absolute inset-0 w-full h-full object-cover object-[50%_35%]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050a18]/90 via-[#050a18]/95 to-[#050a18]/98" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.22),transparent_60%)]" />

          {/* Top hairline */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

          {/* Content */}
          <div className="relative px-7 pt-7 pb-7 text-center">
            {/* Section label */}
            <p className="flex items-center justify-center gap-1.5 text-[10px] tracking-[0.4em] font-mono text-primary/85 uppercase mb-4">
              <ShieldAlert className="h-3 w-3" strokeWidth={2.5} />
              {header}
            </p>

            {/* Brand mark */}
            <div className="flex justify-center mb-4">
              <BrasaoSentinela size={52} title="PlantãoPro" className="drop-shadow-[0_6px_18px_hsl(var(--primary)/0.4)]" />
            </div>

            {/* Title (serif) */}
            <h2
              className="text-2xl leading-tight text-white mb-4"
              style={{ fontFamily: '"Libre Baskerville", Georgia, serif', letterSpacing: '0.01em' }}
            >
              {title}
            </h2>

            {/* Agent info — em primeiro plano: quem tentou o acesso e a
                equipe real dele, não diluído dentro do texto corrido. */}
            {agentName && (
              <div className="mb-3 rounded-xl border border-primary/30 bg-white/[0.06] px-4 py-3 text-left">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 ring-1 ring-primary/40">
                    <UserRound className="h-4.5 w-4.5 text-primary" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-white">{agentName}</p>
                    {agentTeam && (
                      <p
                        className="mt-0.5 text-[10px] tracking-[0.2em] font-mono uppercase text-primary/90"
                      >
                        Equipe {agentTeam}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Message — o motivo, em destaque, como informação principal */}
            <p
              className="text-[15px] font-medium leading-relaxed text-white whitespace-pre-line max-w-sm mx-auto"
              style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}
            >
              {message}
            </p>

            {/* Unit chip (institucional, secundário) */}
            {unit && (
              <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-black/40 px-4 py-1.5 shadow-[0_2px_10px_hsl(var(--primary)/0.2)]">
                <Building2 className="h-3.5 w-3.5 text-primary" strokeWidth={2.2} />
                <span
                  className="text-[10.5px] tracking-[0.3em] font-mono uppercase text-primary/90"
                  style={{ fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}
                >
                  Unidade · {unit}
                </span>
              </div>
            )}

            {/* Action */}
            <div className="mt-6 flex justify-center">
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
