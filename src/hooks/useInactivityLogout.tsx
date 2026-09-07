import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Auto-logout on inactivity. Resets on any user interaction.
 * Fires a warning 1 minute before timeout, then signs out globally.
 */
const IDLE_MS = 15 * 60_000; // 15 minutes
const WARN_MS = 14 * 60_000; // warn at 14 minutes

interface Options {
  enabled: boolean;
  onLogout?: () => void | Promise<void>;
}

export function useInactivityLogout({ enabled, onLogout }: Options) {
  const { toast } = useToast();
  const timerRef = useRef<number | null>(null);
  const warnRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const clear = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (warnRef.current) window.clearTimeout(warnRef.current);
    };

    const reset = () => {
      clear();
      warnRef.current = window.setTimeout(() => {
        toast({
          title: 'Sessão inativa',
          description: 'Você será desconectado em 1 minuto por inatividade.',
          duration: 8000,
        });
      }, WARN_MS);
      timerRef.current = window.setTimeout(async () => {
        try {
          toast({
            title: 'Sessão encerrada',
            description: 'Desconectado automaticamente por inatividade.',
          });
          if (onLogout) {
            await onLogout();
          } else {
            await supabase.auth.signOut({ scope: 'global' }).catch(() => {});
            window.location.replace('/');
          }
        } catch {
          /* noop */
        }
      }, IDLE_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    document.addEventListener('visibilitychange', reset);
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      document.removeEventListener('visibilitychange', reset);
      clear();
    };
  }, [enabled, onLogout, toast]);
}
