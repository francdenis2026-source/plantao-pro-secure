import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { User, Clock, ShieldCheck, Zap, Trash2, KeyRound, Loader2 } from 'lucide-react';
import { formatCPF } from '@/lib/validators';
import {
  getSavedCredentials,
  removeCredential,
  canQuickLogin,
} from '@/components/auth/SavedCredentials';

interface SavedCredential {
  cpf: string;
  name?: string;
  password?: string;
  savedAt: string;
  lastLoginAt?: string;
}

interface QuickLoginCardsProps {
  onQuickLogin: (cpf: string, password: string) => void;
  onSelectCredential: (cpf: string) => void;
  isLoading?: boolean;
  loadingCpf?: string;
}

const QUICK_LOGIN_EXPIRY_HOURS = 72; // 3 days

function deobfuscate(str: string): string {
  try {
    return decodeURIComponent(atob(str));
  } catch {
    return '';
  }
}

function getTimeRemaining(cred: SavedCredential): string | null {
  if (!cred.lastLoginAt || !cred.password) return null;
  const lastLogin = new Date(cred.lastLoginAt);
  const now = new Date();
  const hoursRemaining = QUICK_LOGIN_EXPIRY_HOURS - (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60);
  if (hoursRemaining <= 0) return null;
  if (hoursRemaining >= 24) {
    return `${Math.round(hoursRemaining / 24)}d`;
  }
  if (hoursRemaining < 1) {
    return `${Math.round(hoursRemaining * 60)}min`;
  }
  return `${Math.round(hoursRemaining)}h`;
}

export function QuickLoginCards({ onQuickLogin, onSelectCredential, isLoading, loadingCpf }: QuickLoginCardsProps) {
  const [credentials, setCredentials] = useState<SavedCredential[]>([]);

  useEffect(() => {
    setCredentials(getSavedCredentials());
  }, []);

  const handleRemove = (cpf: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeCredential(cpf);
    setCredentials(getSavedCredentials());
  };

  const handleCardClick = (cred: SavedCredential) => {
    if (isLoading) return;
    
    const canQuick = canQuickLogin(cred);
    
    if (canQuick && cred.password) {
      // Login rápido com 1 clique
      onQuickLogin(cred.cpf, deobfuscate(cred.password));
    } else {
      // Precisa digitar senha
      onSelectCredential(cred.cpf);
    }
  };

  if (credentials.length === 0) return null;

  return (
    <div className="w-full animate-fade-in">
      {/* Header with decorative line */}
      <div className="relative mb-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
        </div>
        <div className="relative flex justify-center">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900/90 rounded-full border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
            <div className="relative">
              <Zap className="h-4 w-4 text-emerald-400" />
              <div className="absolute inset-0 blur-sm bg-emerald-400/50 rounded-full" />
            </div>
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest">
              Acesso Rápido
            </span>
          </div>
        </div>
      </div>
      
      {/* Cards Container with proper constraints */}
      <div className="space-y-2 max-w-full overflow-hidden">
        {credentials.map((cred) => {
          const canQuick = canQuickLogin(cred);
          const timeLeft = getTimeRemaining(cred);
          const isThisLoading = isLoading && loadingCpf === cred.cpf;
          
          return (
            <div
              key={cred.cpf}
              onClick={() => handleCardClick(cred)}
              className={cn(
                "relative p-3 rounded-xl cursor-pointer transition-all duration-300 group overflow-hidden",
                "border-2 shadow-lg",
                canQuick
                  ? "bg-gradient-to-r from-emerald-950/90 via-emerald-900/70 to-emerald-950/90 border-emerald-500/50 hover:border-emerald-400/80 hover:shadow-emerald-500/30"
                  : "bg-gradient-to-r from-slate-800/90 via-slate-700/70 to-slate-800/90 border-slate-600/50 hover:border-slate-500/80 hover:shadow-slate-500/20",
                isThisLoading && "pointer-events-none opacity-70"
              )}
            >
              {/* Animated glow effect */}
              {canQuick && (
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              )}
              
              <div className="flex items-center gap-3 relative z-10">
                {/* Avatar/Icon */}
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 border-2",
                  canQuick
                    ? "bg-gradient-to-br from-emerald-500 to-green-600 border-emerald-400/50 text-white shadow-lg shadow-emerald-500/40 group-hover:scale-110 group-hover:rotate-3"
                    : "bg-slate-700 border-slate-600 text-slate-400 group-hover:bg-slate-600"
                )}>
                  {isThisLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : canQuick ? (
                    <ShieldCheck className="h-5 w-5" />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "font-mono text-sm font-bold tracking-wider",
                      canQuick ? "text-emerald-200" : "text-slate-200"
                    )}>
                      {formatCPF(cred.cpf)}
                    </span>
                    {canQuick && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold uppercase tracking-wider shadow-inner">
                        ⚡ 1-Clique
                      </span>
                    )}
                  </div>
                  {cred.name && (
                    <p className={cn(
                      "text-xs truncate mt-0.5",
                      canQuick ? "text-emerald-400/80" : "text-slate-400"
                    )}>
                      {cred.name}
                    </p>
                  )}
                </div>
                
                {/* Status/Time */}
                <div className="flex items-center gap-2 shrink-0">
                  {canQuick && timeLeft && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 shadow-inner">
                      <Clock className="h-3 w-3 text-emerald-400" />
                      <span className="text-[10px] font-bold text-emerald-300 tabular-nums">{timeLeft}</span>
                    </div>
                  )}
                  
                  {!canQuick && cred.password && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/40">
                      <KeyRound className="h-3 w-3 text-amber-400" />
                      <span className="text-[10px] text-amber-300 font-medium">Expirado</span>
                    </div>
                  )}
                  
                  {/* Remove button */}
                  <button
                    onClick={(e) => handleRemove(cred.cpf, e)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 hover:bg-red-500/15 transition-all"
                    title="Remover credencial"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Bottom decorative line */}
      <div className="mt-3 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
    </div>
  );
}
