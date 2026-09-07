import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface UseAuthGuardOptions {
  requireMasterSession?: boolean;
  requireUserSession?: boolean;
  allowBoth?: boolean;
}

export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const { user, isLoading, masterSession, session } = useAuth();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  const hasCheckedRef = useRef(false);

  const { requireMasterSession = false, requireUserSession = false, allowBoth = true } = options;

  useEffect(() => {
    // Aguardar auth carregar
    if (isLoading) {
      return;
    }

    // Verificar master token no localStorage
    const storedMasterToken = localStorage.getItem('master_token');
    const storedMasterUser = localStorage.getItem('master_user');

    // CRÍTICO: Se estamos na rota /master ou /admin, NUNCA redirecionar
    if (window.location.pathname === '/master' || window.location.pathname === '/admin') {
      setIsReady(true);
      return;
    }

    // CRÍTICO: Se há masterSession ou token master armazenado, NUNCA redirecionar
    if (masterSession || storedMasterToken || storedMasterUser) {
      setIsReady(true);
      return;
    }

    // CRÍTICO: Se há usuário autenticado, NUNCA redirecionar
    if (user && session) {
      setIsReady(true);
      return;
    }

    // Só marca como pronto se já verificou uma vez
    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      
      // Dar tempo extra para sessão se estabelecer (evita logout prematuro)
      const timer = setTimeout(() => {
        let isAuthenticated = false;

        if (requireMasterSession && !requireUserSession) {
          isAuthenticated = !!masterSession || !!storedMasterToken;
        } else if (requireUserSession && !requireMasterSession) {
          isAuthenticated = !!user;
        } else if (allowBoth) {
          isAuthenticated = !!user || !!masterSession || !!storedMasterToken;
        }

        if (!isAuthenticated) {
          // Última verificação antes de redirecionar
          const finalMasterCheck = localStorage.getItem('master_token');
          if (!finalMasterCheck && window.location.pathname !== '/' && window.location.pathname !== '/master') {
            navigate('/', { replace: true });
          }
        }
        
        setIsReady(true);
      }, 1000); // Aumentado para 1 segundo

      return () => clearTimeout(timer);
    } else {
      setIsReady(true);
    }
  }, [isLoading, user, session, masterSession, navigate, requireMasterSession, requireUserSession, allowBoth]);

  // Calcular autenticação incluindo tokens armazenados
  const storedMasterToken = typeof window !== 'undefined' ? localStorage.getItem('master_token') : null;
  
  const shouldRender = !isLoading && isReady && (
    (requireMasterSession && !requireUserSession && (!!masterSession || !!storedMasterToken)) ||
    (requireUserSession && !requireMasterSession && !!user) ||
    (allowBoth && (!!user || !!masterSession || !!storedMasterToken))
  );

  return {
    isLoading: isLoading || !isReady,
    isAuthenticated: shouldRender || !!masterSession || !!storedMasterToken,
    user,
    masterSession,
  };
}
