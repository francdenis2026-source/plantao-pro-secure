import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Gestor de Rondas — ponto de entrada único.
 *
 * Antes existiam DUAS ferramentas de rondas: este modal (RoundsManager,
 * >4500 linhas) e o painel `/rondas` (RoundsDashboard). Agora ambos usam o
 * mesmo painel: aqui ele abre em modal a partir da home, e em página cheia
 * na rota /rondas — mesma UI, mesmos dados, uma implementação só.
 *
 * O painel continua sendo carregado sob demanda (lazy) para não pesar o
 * bundle inicial da home.
 */
const RoundsDashboard = lazy(() =>
  import('@/features/rondas/components/RoundsDashboard').then((m) => ({ default: m.RoundsDashboard })),
);

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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[92dvh] w-[96vw] max-w-6xl flex-col gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">Gestor de Rondas</DialogTitle>
          <DialogDescription className="sr-only">
            Controle, acompanhamento e segurança das rondas em tempo real.
          </DialogDescription>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Suspense
              fallback={
                <div className="space-y-3 p-4">
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-48 w-full rounded-xl" />
                </div>
              }
            >
              {open && <RoundsDashboard />}
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default RoundsManagerLazy;
