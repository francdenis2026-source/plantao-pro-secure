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
    <div className="space-y-2">
      {/* Ação principal em destaque — pausar/retomar a ronda em curso */}
      {isPaused ? (
        <Button
          disabled={disabled || busy != null}
          onClick={() => run('resume', onResume)}
          className="h-11 w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-600/90"
        >
          {busy === 'resume' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
          Retomar ronda
        </Button>
      ) : (
        <Button
          disabled={disabled || busy != null}
          onClick={() => run('pause', onPause)}
          className="h-11 w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-600/90"
        >
          {busy === 'pause' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4 fill-current" />}
          Pausar
        </Button>
      )}

      {/* Ações secundárias */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          disabled={disabled || busy != null}
          onClick={() => setConfirmFinish(true)}
          className="h-10 gap-1.5"
        >
          <CheckCircle2 className="h-4 w-4" />
          Finalizar
        </Button>

        <Button
          variant="outline"
          disabled={disabled || !canExtend || busy != null}
          onClick={() => run('extend', onExtend)}
          className="h-10 gap-1.5"
        >
          {busy === 'extend' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}
          +5 min
        </Button>
      </div>

      <Button
        variant="ghost"
        disabled={disabled}
        onClick={onIncident}
        className="h-9 w-full gap-1.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
      >
        <AlertTriangle className="h-4 w-4" />
        Registrar ocorrência
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
