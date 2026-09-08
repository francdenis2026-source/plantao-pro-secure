import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SessionPersistenceConfig {
  maxRetries?: number;
  retryDelayMs?: number;
  onConnectionLost?: () => void;
  onConnectionRestored?: () => void;
  onMaxRetriesReached?: () => void;
}

export function useSessionPersistence(config: SessionPersistenceConfig = {}) {
  const {
    maxRetries = 5,
    retryDelayMs = 2000,
    onConnectionLost,
    onConnectionRestored,
    onMaxRetriesReached,
  } = config;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const cooldownUntilRef = useRef<number>(0);

  // Keep refs in sync with callbacks
  const onMaxRetriesReachedRef = useRef(onMaxRetriesReached);
  useEffect(() => {
    onMaxRetriesReachedRef.current = onMaxRetriesReached;
  }, [onMaxRetriesReached]);

  // Clear retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const isInCooldown = () => Date.now() < cooldownUntilRef.current;

  // Refresh session with retry logic (NOTE: Supabase already auto-refreshes tokens;
  // this hook must be conservative to avoid refresh-token rate limits that can revoke sessions.)
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      console.log('[SessionPersistence] Offline, skipping refresh');
      return false;
    }

    if (refreshInFlightRef.current) {
      return false;
    }

    if (isInCooldown()) {
      return false;
    }

    // Only attempt refresh if we actually have a session
    const { data: { session: existingSession } } = await supabase.auth.getSession();
    if (!existingSession) {
      return false;
    }

    try {
      refreshInFlightRef.current = true;
      setIsRetrying(true);
      const currentRetry = retryCountRef.current;
      console.log(`[SessionPersistence] Attempting session refresh (attempt ${currentRetry + 1}/${maxRetries})`);

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        throw error;
      }

      if (data.session) {
        console.log('[SessionPersistence] Session refreshed successfully');
        retryCountRef.current = 0;
        setRetryCount(0);
        setLastError(null);
        setIsRetrying(false);
        return true;
      }

      setIsRetrying(false);
      return false;
    } catch (error: any) {
      const msg = String(error?.message || error);
      console.error('[SessionPersistence] Refresh failed:', msg);
      setLastError(msg);

      // If we hit rate limiting, STOP retrying for a while to avoid token revocation.
      if (msg.includes('429') || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('over_request_rate_limit')) {
        cooldownUntilRef.current = Date.now() + 60_000; // 60s cooldown
        retryCountRef.current = 0;
        setRetryCount(0);
        setIsRetrying(false);
        return false;
      }

      retryCountRef.current += 1;
      const newRetryCount = retryCountRef.current;
      setRetryCount(newRetryCount);

      if (newRetryCount < maxRetries) {
        // Exponential backoff
        const delay = retryDelayMs * Math.pow(2, newRetryCount - 1);
        console.log(`[SessionPersistence] Scheduling retry in ${delay}ms`);

        retryTimeoutRef.current = setTimeout(() => {
          refreshSession();
        }, delay);
      } else {
        console.log('[SessionPersistence] Max retries reached');
        setIsRetrying(false);
        onMaxRetriesReachedRef.current?.();
      }

      return false;
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [maxRetries, retryDelayMs]);

  // Validate current session
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[SessionPersistence] Session validation error:', error.message);
        return false;
      }

      if (!session) {
        console.log('[SessionPersistence] No active session');
        return false;
      }

      // NOTE:
      // Do NOT force refreshSession here.
      // The Supabase client already auto-refreshes tokens; forcing refresh can cause
      // refresh storms (429) which revoke tokens and log the user out.
      // We keep this hook as an online/offline indicator + manual retry only.

      return true;
    } catch (error: any) {
      console.error('[SessionPersistence] Validation error:', error.message);
      return false;
    }
  }, [refreshSession]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[SessionPersistence] Connection restored');
      setIsOnline(true);
      retryCountRef.current = 0;
      setRetryCount(0);
      setLastError(null);
      onConnectionRestored?.();

      // IMPORTANT:
      // Do NOT auto-call refreshSession here.
      // Supabase client already does autoRefreshToken, and extra refresh calls can
      // trigger refresh_token rate limiting (429) and token revocation.
    };

    const handleOffline = () => {
      console.log('[SessionPersistence] Connection lost');
      setIsOnline(false);
      onConnectionLost?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onConnectionLost, onConnectionRestored]);

  // Periodic session check
  // IMPORTANT: disabled.
  // The Supabase client already refreshes tokens automatically.
  // Our previous periodic refresh/validate loop was causing token refresh storms (429 /token)
  // which revoke tokens and log the user out.
  useEffect(() => {
    return;
  }, []);

  // Manual retry function
  const manualRetry = useCallback(() => {
    retryCountRef.current = 0;
    setRetryCount(0);
    setLastError(null);
    return refreshSession();
  }, [refreshSession]);

  return {
    isOnline,
    isRetrying,
    retryCount,
    lastError,
    maxRetries,
    refreshSession,
    validateSession,
    manualRetry,
  };
}
