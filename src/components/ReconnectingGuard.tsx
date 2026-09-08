import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkStatus } from '@/hooks/useOfflineCache';

interface ReconnectingGuardProps {
  children: React.ReactNode;
  /** Maximum time to wait for session recovery (ms) */
  maxWaitTime?: number;
}

export function ReconnectingGuard({
  children,
  maxWaitTime = 8000,
}: ReconnectingGuardProps) {
  const { user, session, isLoading, masterSession } = useAuth();
  const { isOnline } = useNetworkStatus();
  
  // Track if user was ever authenticated in this component lifecycle
  const wasAuthenticatedRef = useRef(false);
  const graceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCheckingSessionRef = useRef(false);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (graceTimeoutRef.current) {
        clearTimeout(graceTimeoutRef.current);
      }
    };
  }, []);

  // Prevent pull-to-refresh only while offline. Keeping this listener active
  // during normal navigation makes mobile scrolling feel heavy because it adds
  // a non-passive touchmove handler to the document at the top of the page.
  useEffect(() => {
    if (isOnline) {
      document.body.classList.remove('offline-lock');
      return;
    }

    const preventPullToRefresh = (e: TouchEvent) => {
      // Only prevent if we're at the top of the page
      if (window.scrollY === 0 && e.touches.length === 1) {
        const touch = e.touches[0];
        const startY = touch.clientY;
        
        const handleTouchMove = (moveEvent: TouchEvent) => {
          const currentY = moveEvent.touches[0].clientY;
          // If pulling down from top, prevent it
          if (currentY > startY && window.scrollY === 0) {
            moveEvent.preventDefault();
          }
        };
        
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        
        const cleanup = () => {
          document.removeEventListener('touchmove', handleTouchMove);
        };
        
        document.addEventListener('touchend', cleanup, { once: true });
        document.addEventListener('touchcancel', cleanup, { once: true });
      }
    };
    
    document.body.classList.add('offline-lock');
    document.addEventListener('touchstart', preventPullToRefresh, { passive: true });
    
    return () => {
      document.body.classList.remove('offline-lock');
      document.removeEventListener('touchstart', preventPullToRefresh);
    };
  }, [isOnline]);

  // Handle beforeunload to warn users when offline
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isOnline && wasAuthenticatedRef.current) {
        e.preventDefault();
        e.returnValue = 'Você está offline. Tem certeza que deseja sair?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOnline]);

  // Verify if there's actually a session in Supabase
  const verifySession = useCallback(async (): Promise<boolean> => {
    if (isCheckingSessionRef.current) return true;
    
    // If offline, assume session is still valid (don't try to verify)
    if (!isOnline) return true;
    
    try {
      isCheckingSessionRef.current = true;
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      return !!currentSession;
    } catch {
      // On error, assume session is valid (don't logout user due to network issues)
      return true;
    } finally {
      isCheckingSessionRef.current = false;
    }
  }, [isOnline]);

  // Update wasAuthenticated when we have a valid session
  useEffect(() => {
    if (user || session || masterSession) {
      wasAuthenticatedRef.current = true;
    }
  }, [user, session, masterSession]);

  // Handle session loss - NEVER redirect when offline
  useEffect(() => {
    // Still loading - do nothing
    if (isLoading) return;

    // CRITICAL: If offline, NEVER redirect or logout - maintain current state
    if (!isOnline) {
      return;
    }

    // Verificar tokens armazenados
    const storedMasterToken = localStorage.getItem('master_token');
    const storedMasterUser = localStorage.getItem('master_user');

    // CRÍTICO: Master session SEMPRE bypassa tudo - NUNCA redirecionar
    if (masterSession || storedMasterToken || storedMasterUser) {
      wasAuthenticatedRef.current = true;
      return;
    }

    // Has valid session - all good
    if (user && session) {
      wasAuthenticatedRef.current = true;
      return;
    }

    // CRÍTICO: Se estamos nas rotas protegidas, NUNCA redirecionar automaticamente
    const protectedRoutes = ['/master', '/admin', '/dashboard', '/agent-panel', '/agents', '/settings', '/profile'];
    if (protectedRoutes.some(route => window.location.pathname.startsWith(route))) {
      // Dar tempo para sessão se recuperar
      return;
    }

    // User was authenticated before but now lost session - only redirect if online
    if (wasAuthenticatedRef.current && !user && !session && isOnline) {
      // Clear any existing grace timeout
      if (graceTimeoutRef.current) {
        clearTimeout(graceTimeoutRef.current);
      }

      // Tempo maior para recuperação
      graceTimeoutRef.current = setTimeout(async () => {
        // CRITICAL: Re-check all tokens before any redirect
        const finalMasterCheck = localStorage.getItem('master_token');
        const finalMasterUser = localStorage.getItem('master_user');
        
        if (finalMasterCheck || finalMasterUser) {
          return; // Don't redirect if there's a master token
        }

        // Check if still online
        if (!navigator.onLine) {
          return; // Don't redirect if offline
        }

        // Double-check if we still don't have a session
        const hasSession = await verifySession();
        
        if (!hasSession && navigator.onLine) {
          const { data: { session: latestSession } } = await supabase.auth.getSession();
          
          // Only redirect if truly no session and online
          if (!latestSession && window.location.pathname === '/agent-panel') {
            wasAuthenticatedRef.current = false;
            // Use soft navigation - don't force reload
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }
      }, maxWaitTime + 2000);
    }
  }, [user, session, isLoading, masterSession, verifySession, maxWaitTime, isOnline]);

  // Always render children - no reconnecting UI
  return <>{children}</>;
}
