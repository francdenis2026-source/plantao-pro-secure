import { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/hooks/useOfflineCache';
import { cn } from '@/lib/utils';

/**
 * Floating status pill for the Agent Panel.
 * - Offline: persistent amber pill (top-right, under the safe-area).
 * - Reconnect: 3-second green confirmation pill, then auto-hides.
 * Non-blocking, pointer-events-none on the container so it never obstructs.
 */
export function NetworkStatusPill() {
  const { isOnline } = useNetworkStatus();
  const [state, setState] = useState<'idle' | 'offline' | 'reconnected'>(
    typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'idle',
  );

  useEffect(() => {
    if (!isOnline) {
      setState('offline');
      return;
    }
    if (state === 'offline') {
      setState('reconnected');
      const t = window.setTimeout(() => setState('idle'), 3000);
      return () => window.clearTimeout(t);
    }
  }, [isOnline, state]);

  if (state === 'idle') return null;

  const isOffline = state === 'offline';

  return (
    <div
      className="pointer-events-none fixed z-[80] top-2 right-2 sm:top-3 sm:right-3"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      aria-live="polite"
      role="status"
    >
      <div
        className={cn(
          'flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider shadow-lg backdrop-blur-md',
          isOffline
            ? 'border-amber-500/60 bg-amber-950/85 text-amber-200'
            : 'border-emerald-500/60 bg-emerald-950/85 text-emerald-200',
        )}
      >
        <span
          className={cn(
            'flex h-2 w-2 rounded-full',
            isOffline ? 'bg-amber-400' : 'bg-emerald-400',
          )}
        />
        {isOffline ? 'Sem conexão' : 'Conexão restaurada'}
      </div>
    </div>
  );
}

