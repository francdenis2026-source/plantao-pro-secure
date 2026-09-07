import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
import { ShieldAlert } from 'lucide-react';

const IDLE_MS = 15 * 60_000; // 15 min total
const WARN_BEFORE_MS = 60_000; // countdown starts 1 min before

/**
 * Renders a visible countdown dialog 1 minute before an inactivity logout.
 * User can click "Continuar conectado" to reset the timer, or "Sair agora"
 * to sign out immediately. Any user interaction outside the dialog also
 * resets the timer while the warning is not open.
 */
export function InactivityGuard() {
  const { user, signOut } = useAuth();
  const [warnOpen, setWarnOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const warnTimerRef = useRef<number | null>(null);
  const logoutTimerRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const warnOpenRef = useRef(false);

  const clearAll = useCallback(() => {
    if (warnTimerRef.current) window.clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) window.clearTimeout(logoutTimerRef.current);
    if (tickRef.current) window.clearInterval(tickRef.current);
  }, []);

  const scheduleWarn = useCallback(() => {
    clearAll();
    warnTimerRef.current = window.setTimeout(() => {
      warnOpenRef.current = true;
      setWarnOpen(true);
      setSecondsLeft(Math.floor(WARN_BEFORE_MS / 1000));
      tickRef.current = window.setInterval(() => {
        setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
      }, 1000);
      logoutTimerRef.current = window.setTimeout(async () => {
        warnOpenRef.current = false;
        setWarnOpen(false);
        clearAll();
        await signOut();
      }, WARN_BEFORE_MS);
    }, IDLE_MS - WARN_BEFORE_MS);
  }, [clearAll, signOut]);

  useEffect(() => {
    if (!user) {
      clearAll();
      setWarnOpen(false);
      warnOpenRef.current = false;
      return;
    }

    const onActivity = () => {
      // While the warning dialog is open, ignore activity — user must decide.
      if (warnOpenRef.current) return;
      scheduleWarn();
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onActivity);

    scheduleWarn();

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onActivity);
      clearAll();
    };
  }, [user, scheduleWarn, clearAll]);

  const stayConnected = () => {
    warnOpenRef.current = false;
    setWarnOpen(false);
    clearAll();
    scheduleWarn();
  };

  const logoutNow = async () => {
    warnOpenRef.current = false;
    setWarnOpen(false);
    clearAll();
    await signOut();
  };

  if (!user) return null;

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <AlertDialog open={warnOpen}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <ShieldAlert className="h-5 w-5" />
            Sessão prestes a expirar
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <span className="block">
              Detectamos inatividade em sua conta. Por segurança, você será
              desconectado automaticamente em:
            </span>
            <span
              className="mx-auto block w-fit rounded-md bg-amber-500/10 px-4 py-2 font-mono text-3xl font-bold tabular-nums text-amber-600 ring-1 ring-amber-500/30"
              aria-live="polite"
            >
              {mm}:{ss}
            </span>
            <span className="block text-xs text-muted-foreground">
              Clique em <b>Continuar conectado</b> para permanecer no painel.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={logoutNow}>Sair agora</AlertDialogCancel>
          <AlertDialogAction onClick={stayConnected}>
            Continuar conectado
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
