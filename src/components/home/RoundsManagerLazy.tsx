import { useCallback, useEffect, useState, type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { RoundsDashboard } from '@/features/rondas/components/RoundsDashboard';

/**
 * Gestor de Rondas — ponto de entrada único.
 *
 * Antes existiam DUAS ferramentas de rondas: este modal (RoundsManager,
 * >4500 linhas) e o painel `/rondas` (RoundsDashboard). Agora ambos usam o
 * mesmo painel: aqui ele abre em modal a partir da home, e em página cheia
 * na rota /rondas — mesma UI, mesmos dados, uma implementação só.
 *
 * O painel é importado diretamente (sem lazy/Suspense) para que a abertura
 * seja instantânea — sem tela de carregamento nem overlay escuro à espera
 * de um chunk assíncrono.
 */
interface Props {
  customTrigger?: ReactNode;
}

export function RoundsManagerLazy({ customTrigger }: Props) {
  const [open, setOpen] = useState(false);

  // Mantém o contrato do evento global usado por outros pontos do app.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('rounds:open', handler);
    return () => window.removeEventListener('rounds:open', handler);
  }, []);

  const handleTriggerClick = useCallback(() => setOpen(true), []);

  return (
    <>
      <span
        onClick={handleTriggerClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTriggerClick();
          }
        }}
        role="presentation"
        className="contents"
      >
        {customTrigger}
      </span>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          {/* Overlay leve e rápido — nada de scrim quase-preto nem blur pesado,
              para a abertura não parecer uma "tela preta" antes do conteúdo. */}
          <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-150" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[61] flex max-h-[92dvh] w-[96vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 flex-col gap-0 overflow-hidden rounded-xl border border-border bg-background shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-150">
            <DialogPrimitive.Title className="sr-only">Gestor de Rondas</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Controle, acompanhamento e segurança das rondas em tempo real.
            </DialogPrimitive.Description>
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="absolute right-2 top-2 sm:right-3 sm:top-3 z-[62] inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-primary/40 bg-background/95 text-foreground shadow-lg transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
              <span className="sr-only">Fechar</span>
            </DialogPrimitive.Close>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {open && <RoundsDashboard />}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

export default RoundsManagerLazy;
