import { useNetworkStatus } from '@/hooks/useOfflineCache';
import { WifiOff, Wifi, RefreshCw, CloudOff, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface OfflineIndicatorProps {
  isFromCache?: boolean;
  lastSync?: Date | null;
  onRefresh?: () => void;
  compact?: boolean;
}

export function OfflineIndicator({ 
  isFromCache, 
  lastSync, 
  onRefresh,
  compact = false 
}: OfflineIndicatorProps) {
  const { isOnline } = useNetworkStatus();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
    } else if (showBanner) {
      // Show "back online" briefly
      const timer = setTimeout(() => setShowBanner(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, showBanner]);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {isOnline ? (
          <div className="flex items-center gap-1 text-green-500">
            <Wifi className="h-3 w-3" />
            {isFromCache && (
              <span className="text-[9px] text-amber-400">(cache)</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-amber-500">
            <WifiOff className="h-3 w-3" />
            <span className="text-[9px]">Offline</span>
          </div>
        )}
      </div>
    );
  }

  if (!showBanner && !isFromCache) return null;

  return (
    <div className={cn(
      "rounded-lg p-2 sm:p-3 flex items-center justify-between gap-2 animate-fade-in",
      !isOnline 
        ? "bg-amber-500/20 border border-amber-500/40" 
        : isFromCache 
          ? "bg-blue-500/20 border border-blue-500/40"
          : "bg-green-500/20 border border-green-500/40"
    )}>
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <CloudOff className="h-4 w-4 text-amber-400" />
            <div>
              <p className="text-xs font-medium text-amber-400">Modo Offline</p>
              <p className="text-[10px] text-amber-300/80">
                Exibindo dados salvos localmente
              </p>
            </div>
          </>
        ) : isFromCache ? (
          <>
            <Cloud className="h-4 w-4 text-blue-400" />
            <div>
              <p className="text-xs font-medium text-blue-400">Dados do Cache</p>
              {lastSync && (
                <p className="text-[10px] text-blue-300/80">
                  Última sincronização: {formatLastSync(lastSync)}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <Wifi className="h-4 w-4 text-green-400" />
            <div>
              <p className="text-xs font-medium text-green-400">Conexão Restaurada</p>
              <p className="text-[10px] text-green-300/80">Dados atualizados</p>
            </div>
          </>
        )}
      </div>

      {onRefresh && isOnline && (
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          title="Atualizar dados"
        >
          <RefreshCw className="h-3.5 w-3.5 text-white" />
        </button>
      )}
    </div>
  );
}

function formatLastSync(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `há ${diffMins} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Global offline banner for the app
export function GlobalOfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const [showBanner, setShowBanner] = useState(!isOnline);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
      setIsReconnecting(false);
    } else if (showBanner) {
      setIsReconnecting(true);
      const timer = setTimeout(() => {
        setShowBanner(false);
        setIsReconnecting(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, showBanner]);

  if (!showBanner) return null;

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-[100] py-1.5 px-4 text-center text-xs font-medium transition-all duration-300",
      isReconnecting 
        ? "bg-green-600 text-white" 
        : "bg-amber-600 text-white"
    )}>
      <div className="flex items-center justify-center gap-2">
        {isReconnecting ? (
          <>
            <Wifi className="h-3 w-3" />
            <span>Conexão restaurada!</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            <span>Sem conexão - Modo Offline</span>
          </>
        )}
      </div>
    </div>
  );
}
