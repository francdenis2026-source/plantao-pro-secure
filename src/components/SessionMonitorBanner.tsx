import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wifi, 
  WifiOff, 
  Clock, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  Shield,
  ShieldOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionMonitorBannerProps {
  onExportDiagnostics?: () => void;
  showExpanded?: boolean;
}

export function SessionMonitorBanner({ 
  onExportDiagnostics,
  showExpanded = false 
}: SessionMonitorBannerProps) {
  const { session, user, isLoading } = useAuth();
  const { isOnline, isRetrying, retryCount, lastError, manualRetry } = useSessionPersistence();
  const [expanded, setExpanded] = useState(showExpanded);
  const [now, setNow] = useState(Date.now());

  // Update time every second for expiration countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const expiresAt = (session as any)?.expires_at as number | undefined;
  const expiresIn = (session as any)?.expires_in as number | undefined;

  // Prefer expires_at (epoch seconds). If it looks "already expiring" right after login,
  // fall back to a computed expiry from expires_in to avoid false alarms caused by clock skew.
  let expiresAtMs = typeof expiresAt === 'number' ? expiresAt * 1000 : null;
  const nowMs = now;
  const looksWrong =
    expiresAtMs !== null &&
    typeof expiresIn === 'number' &&
    expiresIn > 5 * 60 &&
    expiresAtMs < nowMs + 60_000;

  if (looksWrong) {
    expiresAtMs = nowMs + expiresIn * 1000;
  }

  const timeUntilExpiry = expiresAtMs ? Math.max(0, expiresAtMs - nowMs) : null;

  const formatTimeRemaining = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const sessionStatus = useMemo(() => {
    if (isLoading) return 'loading';
    // During token refresh, session may temporarily be null - don't show as "no-session"
    if (!user && !session) {
      // Give extra grace period during initial load
      return 'loading';
    }

    // Supabase tokens rotate frequently; warning too early creates false alarms.
    // Only warn when it's actually very close to expiring.
    if (timeUntilExpiry !== null) {
      if (timeUntilExpiry === 0) return 'expired';
      if (timeUntilExpiry < 60 * 1000) return 'expiring-soon';
    }

    return 'active';
  }, [isLoading, user, session, timeUntilExpiry]);

  // Don't show the banner if everything is OK and session is active
  const shouldHideBanner = sessionStatus === 'active' && isOnline && !isRetrying && !lastError;
  
  // Don't show banner during initial loading
  if (sessionStatus === 'loading' || shouldHideBanner) {
    return null;
  }

  const getStatusColor = () => {
    if (!isOnline) return 'bg-yellow-600';
    if (isRetrying) return 'bg-blue-600';
    if (lastError) return 'bg-red-600';
    if (sessionStatus === 'expired') return 'bg-red-600';
    if (sessionStatus === 'expiring-soon') return 'bg-amber-600';
    return 'bg-emerald-600';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4" />;
    if (isRetrying) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (lastError || sessionStatus === 'expired') {
      return <ShieldOff className="h-4 w-4" />;
    }
    if (sessionStatus === 'expiring-soon') return <AlertTriangle className="h-4 w-4" />;
    return <Shield className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isRetrying) return `Reconectando (${retryCount})`;
    if (lastError) return 'Erro de autenticação';
    if (sessionStatus === 'expired') return 'Sessão expirada';
    if (sessionStatus === 'expiring-soon') return 'Sessão quase expirando';
    return 'Sessão OK';
  };

  return (
    <div className={cn(
      'text-white text-sm transition-all duration-300',
      getStatusColor()
    )}>
      {/* Compact view */}
      <div 
        className="flex items-center justify-between px-4 py-1.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium">{getStatusText()}</span>
          
          {/* Quick badges */}
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-white/30 text-white/90">
              {isOnline ? <Wifi className="h-2.5 w-2.5 mr-1" /> : <WifiOff className="h-2.5 w-2.5 mr-1" />}
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            
            {timeUntilExpiry !== null && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-white/30 text-white/90">
                <Clock className="h-2.5 w-2.5 mr-1" />
                {formatTimeRemaining(timeUntilExpiry)}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {lastError && (
            <span className="text-xs text-white/80 max-w-[150px] truncate hidden md:inline">
              {lastError}
            </span>
          )}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-white/20 space-y-2 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white/10 rounded px-2 py-1">
              <div className="text-white/60">Conexão</div>
              <div className="font-medium">{isOnline ? 'Ativa' : 'Perdida'}</div>
            </div>
            <div className="bg-white/10 rounded px-2 py-1">
              <div className="text-white/60">Sessão</div>
              <div className="font-medium">{session ? 'Ativa' : 'Inativa'}</div>
            </div>
            <div className="bg-white/10 rounded px-2 py-1">
              <div className="text-white/60">Token expira em</div>
              <div className="font-medium">
                {timeUntilExpiry !== null ? formatTimeRemaining(timeUntilExpiry) : '—'}
              </div>
              {looksWrong && (
                <div className="text-[10px] text-white/70 mt-0.5">
                  Ajustado (relógio do aparelho)
                </div>
              )}
            </div>
            <div className="bg-white/10 rounded px-2 py-1">
              <div className="text-white/60">User ID</div>
              <div className="font-medium truncate">{user?.id?.slice(0, 8) || '—'}</div>
            </div>
          </div>

          {lastError && (
            <div className="bg-red-900/40 rounded px-2 py-1.5 text-xs">
              <div className="text-white/60 mb-0.5">Último erro</div>
              <div className="font-mono text-white/90">{lastError}</div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {(lastError || isRetrying) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  manualRetry();
                }}
                className="text-xs h-7"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Tentar reconectar
              </Button>
            )}
            
            {onExportDiagnostics && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onExportDiagnostics();
                }}
                className="text-xs h-7 border-white/30 text-white hover:bg-white/20"
              >
                Exportar diagnóstico
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
