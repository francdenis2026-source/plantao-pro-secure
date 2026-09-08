import { useState } from 'react';
import { Pause, Play, CheckCircle2, Clock3, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { PatrolSlot } from '../types';

interface RoundControlsProps {
  slot: PatrolSlot;
  isPaused: boolean;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onComplete: () => Promise<void>;
  onExtend: () => Promise<void>;
  onIncident: () => void;
  canExtend: boolean;
}

export function RoundControls({ slot, isPaused, onPause, onResume, onComplete, onExtend, onIncident, canExtend }: RoundControlsProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const disabled = slot.status === 'completed' || slot.status === 'cancelled';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isPaused ? (
        <Button size="sm" disabled={disabled || busy != null} onClick={() => run('resume', onResume)} className="gap-1.5">
          {busy === 'resume' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Retomar
        </Button>
      ) : (
        <Button size="sm" variant="secondary" disabled={disabled || busy != null} onClick={() => run('pause', onPause)} className="gap-1.5">
          {busy === 'pause' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
          Pausar
        </Button>
      )}

      <Button size="sm" variant="outline" disabled={disabled || !canExtend || busy != null} onClick={() => run('extend', onExtend)} className="gap-1.5">
        {busy === 'extend' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}
        +5 min
      </Button>

      <Button size="sm" variant="outline" disabled={disabled} onClick={onIncident} className="gap-1.5">
        <AlertTriangle className="h-4 w-4" />
        Ocorrência
      </Button>

      <Button size="sm" variant="default" disabled={disabled || busy != null} onClick={() => setConfirmFinish(true)} className="ml-auto gap-1.5 bg-success text-success-foreground hover:bg-success/90">
        <CheckCircle2 className="h-4 w-4" />
        Finalizar
      </Button>

      <AlertDialog open={confirmFinish} onOpenChange={setConfirmFinish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar esta ronda?</AlertDialogTitle>
            <AlertDialogDescription>
              O horário de término real será registrado agora. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => run('complete', onComplete)}>Finalizar ronda</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
