import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Lock, ShieldAlert, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MissionLockDialogProps {
  open: boolean;
  onClose: () => void;
  color: string;
  agentName?: string;
  remainingLabel?: string;
  silent?: boolean;
}

/**
 * Professional lock dialog shown when an agent tries to pause/reset
 * an ongoing rounds countdown. Reinforces mission integrity.
 */
export function MissionLockDialog({ open, onClose, color, agentName, remainingLabel, silent = false }: MissionLockDialogProps) {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setDots((d) => (d + 1) % 4), 500);
    return () => window.clearInterval(id);
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-md border-2 overflow-hidden p-0" style={{ borderColor: `${color}80` }}>
        {/* Alert stripe */}
        <div
          className="relative h-10 flex items-center justify-center overflow-hidden"
          style={{ background: `linear-gradient(90deg, ${color}22, ${color}55, ${color}22)` }}
        >
          {!silent && (
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, ${color} 0 10px, transparent 10px 20px)`,
                animation: 'stripeSlide 1.2s linear infinite',
              }}
            />
          )}
          <div className="relative flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] font-bold" style={{ color }}>
            <ShieldAlert className={cn('h-4 w-4', !silent && 'animate-pulse')} />
            Missão em andamento
            <ShieldAlert className={cn('h-4 w-4', !silent && 'animate-pulse')} />
          </div>
        </div>

        <div className="p-6 pt-4">
          <AlertDialogHeader>
            <div className="mx-auto mb-3 relative">
              {!silent && (
                <div
                  className="absolute inset-0 rounded-full blur-xl opacity-60"
                  style={{ backgroundColor: color }}
                />
              )}
              <div
                className="relative w-16 h-16 rounded-full flex items-center justify-center border-2"
                style={{ borderColor: color, background: `${color}18` }}
              >
                <Lock className="h-7 w-7" style={{ color }} />
              </div>
            </div>

            <AlertDialogTitle className="text-center text-xl font-black uppercase tracking-wide">
              Ação bloqueada
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-center space-y-3 mt-2">
                <p className="text-sm leading-relaxed text-foreground/90">
                  A contagem <span className="font-semibold" style={{ color }}>NÃO pode ser interrompida</span> após o início.
                  Pausar ou reiniciar comprometeria a dinâmica, a ordem dos agentes e a integridade da ronda.
                </p>
                <div className="rounded-lg border border-border/60 bg-muted/40 p-3 space-y-1.5">
                  <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-mono">
                    <Radio className="h-3 w-3" style={{ color }} />
                    Aguarde a conclusão
                  </div>
                  {agentName && (
                    <div className="text-sm font-bold" style={{ color }}>
                      Agente ativo: {agentName}
                    </div>
                  )}
                  {remainingLabel && (
                    <div className="font-mono text-xs text-muted-foreground">
                      Tempo restante do slot: <span className="text-foreground font-semibold">{remainingLabel}</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground italic">
                  Disciplina é segurança{'.'.repeat(dots)}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-5 sm:justify-center">
            <AlertDialogAction
              onClick={onClose}
              className="min-w-40 font-bold tracking-wide uppercase"
              style={{ backgroundColor: color, color: '#0b0f14' }}
            >
              Entendido, continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>

        <style>{`@keyframes stripeSlide { from { background-position: 0 0 } to { background-position: 40px 0 } }`}</style>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default MissionLockDialog;
