import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

export type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  /** Se definido, exige que o usuário digite exatamente este texto para habilitar o botão de confirmação. */
  requireText?: string;
};

type Ctx = (opts?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Ctx | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({});
  const [typed, setTyped] = useState('');
  const resolver = useRef<(v: boolean) => void>();

  const confirm = useCallback<Ctx>((o = {}) => {
    setOpts(o);
    setTyped('');
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const done = (v: boolean) => {
    setOpen(false);
    resolver.current?.(v);
    resolver.current = undefined;
  };

  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  const needsText = !!opts.requireText;
  const textOk = !needsText || typed.trim() === opts.requireText;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={open} onOpenChange={(o) => !o && done(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className={opts.destructive ? 'h-5 w-5 text-destructive' : 'h-5 w-5 text-amber-500'} />
              {opts.title ?? 'Confirmar ação'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {opts.description ?? 'Tem certeza que deseja continuar?'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {needsText && (
            <div className="space-y-2">
              <Label htmlFor="confirm-require-text" className="text-xs">
                Digite <span className="font-mono font-bold">{opts.requireText}</span> para confirmar
              </Label>
              <Input
                id="confirm-require-text"
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => done(false)}>
              {opts.cancelText ?? 'Cancelar'}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!textOk}
              onClick={() => textOk && done(true)}
              className={opts.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {opts.confirmText ?? 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Ctx {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return ctx;
}
