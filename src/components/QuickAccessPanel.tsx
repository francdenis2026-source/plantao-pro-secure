import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { User, Clock, ShieldCheck, Zap, Trash2, KeyRound, Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatCPF } from '@/lib/validators';
import {
  getSavedCredentials,
  removeCredential,
  canQuickLogin,
  CREDENTIALS_CHANGED_EVENT,
} from '@/components/auth/SavedCredentials';

interface SavedCredential {
  cpf: string;
  name?: string;
  password?: string;
  savedAt: string;
  lastLoginAt?: string;
}

interface QuickAccessPanelProps {
  onQuickLogin: (cpf: string, password: string) => void;
  onSelectCredential: (cpf: string) => void;
  isLoading?: boolean;
  loadingCpf?: string;
}

const QUICK_LOGIN_EXPIRY_HOURS = 72;

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

export function QuickAccessPanel({ onQuickLogin, onSelectCredential, isLoading, loadingCpf }: QuickAccessPanelProps) {
  const [credentials, setCredentials] = useState<SavedCredential[]>([]);

  useEffect(() => {
    const refresh = () => setCredentials(getSavedCredentials());
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'plantao_pro_saved_credentials') refresh();
    };
    window.addEventListener(CREDENTIALS_CHANGED_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CREDENTIALS_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const handleRemove = (cpf: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeCredential(cpf);
    setCredentials(getSavedCredentials());
    toast.success('Credencial removida', {
      description: `CPF •••${cpf.slice(-2)} apagado deste dispositivo`,
      duration: 2500,
    });
  };

  const handleCardClick = (cred: SavedCredential) => {
    if (isLoading) return;
    
    const canQuick = canQuickLogin(cred);
    
    if (canQuick && cred.password) {
      onQuickLogin(cred.cpf, deobfuscate(cred.password));
    } else {
      onSelectCredential(cred.cpf);
    }
  };

  if (credentials.length === 0) return null;

  return (
    <section
      aria-label="Acesso rápido"
      className="w-full max-w-sm mx-auto animate-fade-in"
    >
      <div className="relative rounded-xl overflow-hidden bg-black/30 backdrop-blur-md border border-primary/20 shadow-lg">
        {/* Subtle glow */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />

        {/* Section header — hierarquia consistente */}
        <header className="section-header relative !mb-0 px-3.5 pt-2.5 pb-2 bg-primary/5">
          <Zap className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
          <h2 className="text-[11px] font-semibold text-primary/90 uppercase tracking-wider leading-none">
            Acesso Rápido
          </h2>
          <span className="ml-auto text-[10px] font-medium text-primary/60 tabular-nums">
            {Math.min(credentials.length, 2)}
          </span>
        </header>

        {/* Credentials list — densidade reduzida, touch targets ≥44px */}
        <ul className="relative p-2 stack-tight list-none">
          {credentials.slice(0, 2).map((cred) => {
            const canQuick = canQuickLogin(cred);
            const timeLeft = getTimeRemaining(cred);
            const isThisLoading = isLoading && loadingCpf === cred.cpf;

            return (
              <li key={cred.cpf}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardClick(cred)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCardClick(cred);
                    }
                  }}
                  className={cn(
                    'relative group cursor-pointer rounded-lg transition-all duration-200',
                    'border overflow-hidden focus-ring-primary outline-none',
                    'active:scale-[0.98]',
                    canQuick
                      ? 'bg-emerald-950/40 border-emerald-500/30 hover:border-emerald-400/60 hover:bg-emerald-900/30'
                      : 'bg-slate-800/40 border-slate-600/30 hover:border-slate-500/50',
                    isThisLoading && 'pointer-events-none opacity-60'
                  )}
                >
                  <div className="relative px-3 py-2.5 flex items-center gap-2.5 min-h-[52px]">
                    {/* Avatar */}
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all',
                        canQuick
                          ? 'bg-gradient-to-br from-emerald-500/80 to-green-600/80 text-white shadow shadow-emerald-500/20'
                          : 'bg-slate-700/60 text-slate-400'
                      )}
                    >
                      {isThisLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : canQuick ? (
                        <ShieldCheck className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <span
                        className={cn(
                          'font-mono text-xs font-bold tracking-wide block',
                          canQuick ? 'text-emerald-200' : 'text-slate-300'
                        )}
                      >
                        {formatCPF(cred.cpf).replace(/\d(?=\d{2})/g, '•')}
                      </span>
                      {cred.name && (
                        <p
                          className={cn(
                            'text-[11px] truncate mt-0.5',
                            canQuick ? 'text-emerald-400/70' : 'text-slate-500'
                          )}
                        >
                          {cred.name}
                        </p>
                      )}
                    </div>

                    {/* Status & Actions — sempre visíveis (mobile-first) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {canQuick && timeLeft && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[9px] font-bold">
                          <Clock className="h-2.5 w-2.5" />
                          {timeLeft}
                        </span>
                      )}

                      {canQuick ? (
                        <ChevronRight className="h-4 w-4 text-emerald-400/70 group-hover:translate-x-0.5 transition-transform" />
                      ) : cred.password ? (
                        <KeyRound className="h-3.5 w-3.5 text-amber-400/60" />
                      ) : null}

                      <button
                        type="button"
                        onClick={(e) => handleRemove(cred.cpf, e)}
                        aria-label={`Remover credencial ${formatCPF(cred.cpf)}`}
                        className="w-8 h-8 flex items-center justify-center rounded-md text-red-400/60 hover:text-red-400 hover:bg-red-500/10 focus-ring-primary transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
