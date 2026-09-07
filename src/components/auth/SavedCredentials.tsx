import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Trash2, User, Key, KeyRound, Clock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { formatCPF } from '@/lib/validators';

interface SavedCredential {
  cpf: string;
  name?: string;
  password?: string; // Base64 encoded for basic obfuscation
  savedAt: string;
  lastLoginAt?: string; // Track last successful login
}

interface SavedCredentialsProps {
  onSelectCredential: (cpf: string, password?: string) => void;
  onSaveChange: (saveCpf: boolean, savePassword: boolean) => void;
  saveCpf: boolean;
  savePassword: boolean;
}

const STORAGE_KEY = 'plantao_pro_saved_credentials';
const DEVICE_KEY_STORAGE = 'plantao_pro_device_key';
const QUICK_LOGIN_EXPIRY_HOURS = 72; // Hours before requiring password again (3 days)

// Per-device random key (persisted). Prevents casual reading and cross-device
// leaks by binding stored secrets to this device. Not a substitute for
// server-side auth, but a meaningful hardening over plain base64.
function getDeviceKey(): string {
  let k = localStorage.getItem(DEVICE_KEY_STORAGE);
  if (!k) {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    k = Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(DEVICE_KEY_STORAGE, k);
  }
  return k;
}

const ENC_PREFIX = 'v2:';
function obfuscate(str: string): string {
  const key = getDeviceKey();
  const bytes = new TextEncoder().encode(str);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ key.charCodeAt(i % key.length);
  }
  let bin = '';
  for (let i = 0; i < out.length; i++) bin += String.fromCharCode(out[i]);
  return ENC_PREFIX + btoa(bin);
}

function deobfuscate(str: string): string {
  try {
    if (str.startsWith(ENC_PREFIX)) {
      const key = getDeviceKey();
      const raw = atob(str.slice(ENC_PREFIX.length));
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        bytes[i] = raw.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      }
      return new TextDecoder().decode(bytes);
    }
    // Backward compatibility with legacy base64 format
    return decodeURIComponent(atob(str));
  } catch {
    return '';
  }
}

export const CREDENTIALS_CHANGED_EVENT = 'plantao_pro:credentials_changed';

function notifyCredentialsChanged() {
  try {
    window.dispatchEvent(new CustomEvent(CREDENTIALS_CHANGED_EVENT));
  } catch {
    /* noop */
  }
}

export function getSavedCredentials(): SavedCredential[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveCredential(cpf: string, name?: string, password?: string) {
  const credentials = getSavedCredentials();
  const cleanCpf = cpf.replace(/\D/g, '');
  
  // Check if already exists
  const existingIndex = credentials.findIndex(c => c.cpf === cleanCpf);
  
  const newCredential: SavedCredential = {
    cpf: cleanCpf,
    name,
    password: password ? obfuscate(password) : undefined,
    savedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
  
  if (existingIndex >= 0) {
    // Update existing
    credentials[existingIndex] = newCredential;
  } else {
    // Add new (max 5 saved)
    credentials.unshift(newCredential);
    if (credentials.length > 5) {
      credentials.pop();
    }
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
  notifyCredentialsChanged();
}

export function updateLastLogin(cpf: string) {
  const credentials = getSavedCredentials();
  const cleanCpf = cpf.replace(/\D/g, '');
  const updated = credentials.map(c => 
    c.cpf === cleanCpf ? { ...c, lastLoginAt: new Date().toISOString() } : c
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  notifyCredentialsChanged();
}

export function removeCredentialPassword(cpf: string) {
  const credentials = getSavedCredentials();
  const cleanCpf = cpf.replace(/\D/g, '');
  const updated = credentials.map(c => 
    c.cpf === cleanCpf ? { ...c, password: undefined } : c
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  notifyCredentialsChanged();
}

export function removeCredential(cpf: string) {
  const credentials = getSavedCredentials();
  const cleanCpf = cpf.replace(/\D/g, '');
  const filtered = credentials.filter(c => c.cpf !== cleanCpf);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  notifyCredentialsChanged();
}

export function clearAllCredentials() {
  localStorage.removeItem(STORAGE_KEY);
  notifyCredentialsChanged();
}

// Check if quick login is possible (credential has password and was used within expiry period)
export function canQuickLogin(credential: SavedCredential): boolean {
  if (!credential.password || !credential.lastLoginAt) return false;
  
  const lastLogin = new Date(credential.lastLoginAt);
  const now = new Date();
  const hoursSinceLogin = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60);
  
  return hoursSinceLogin < QUICK_LOGIN_EXPIRY_HOURS;
}

// Get credential for quick login if available
export function getQuickLoginCredential(cpf: string): { cpf: string; password: string } | null {
  const credentials = getSavedCredentials();
  const cleanCpf = cpf.replace(/\D/g, '');
  const cred = credentials.find(c => c.cpf === cleanCpf);
  
  if (cred && cred.password && canQuickLogin(cred)) {
    return {
      cpf: cred.cpf,
      password: deobfuscate(cred.password)
    };
  }
  
  return null;
}

// Check if auto-login is possible (only one saved credential with password within expiry)
export function getAutoLoginCredential(): { cpf: string; password: string } | null {
  const credentials = getSavedCredentials();
  const validCredentials = credentials.filter(c => c.password && canQuickLogin(c));
  
  if (validCredentials.length === 1 && validCredentials[0].password) {
    return {
      cpf: validCredentials[0].cpf,
      password: deobfuscate(validCredentials[0].password)
    };
  }
  
  return null;
}

export function SavedCredentials({ onSelectCredential, onSaveChange, saveCpf, savePassword }: SavedCredentialsProps) {
  const [credentials, setCredentials] = useState<SavedCredential[]>([]);
  
  useEffect(() => {
    const refresh = () => setCredentials(getSavedCredentials());
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === STORAGE_KEY) refresh();
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

  const handleRemovePassword = (cpf: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeCredentialPassword(cpf);
    setCredentials(getSavedCredentials());
    toast('Senha rápida removida', {
      description: 'Na próxima entrada será necessário digitar a senha.',
      duration: 2500,
    });
  };

  const handleClearAll = () => {
    const count = credentials.length;
    clearAllCredentials();
    setCredentials([]);
    toast.success('Credenciais limpas', {
      description: `${count} credencial(is) removida(s) em tempo real.`,
      duration: 2500,
    });
  };

  const handleSelectCredential = (cred: SavedCredential) => {
    const password = cred.password ? deobfuscate(cred.password) : undefined;
    onSelectCredential(cred.cpf, password);
  };

  const handleSaveCpfChange = (checked: boolean) => {
    if (!checked) {
      onSaveChange(false, false);
    } else {
      onSaveChange(true, savePassword);
    }
  };

  const handleSavePasswordChange = (checked: boolean) => {
    onSaveChange(saveCpf, checked);
  };

  const getTimeRemaining = (cred: SavedCredential): string | null => {
    if (!cred.lastLoginAt || !cred.password) return null;
    const lastLogin = new Date(cred.lastLoginAt);
    const now = new Date();
    const hoursRemaining = QUICK_LOGIN_EXPIRY_HOURS - (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60);
    if (hoursRemaining <= 0) return null;
    if (hoursRemaining < 1) {
      return `${Math.round(hoursRemaining * 60)}min`;
    }
    return `${Math.round(hoursRemaining)}h`;
  };

  return (
    <div className="space-y-2">
      {credentials.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Acesso Rápido</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-5 text-[10px] text-destructive/70 hover:text-destructive px-1"
              onClick={handleClearAll}
            >
              <Trash2 className="h-2.5 w-2.5 mr-0.5" />
              Limpar
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {credentials.map((cred) => {
              const canQuick = canQuickLogin(cred);
              const timeLeft = getTimeRemaining(cred);
              
              return (
                <div
                  key={cred.cpf}
                  onClick={() => handleSelectCredential(cred)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer group transition-all text-xs ${
                    canQuick 
                      ? 'bg-green-500/15 hover:bg-green-500/25 border border-green-500/30' 
                      : 'bg-muted/40 hover:bg-muted/60 border border-border/50'
                  }`}
                  title={canQuick ? 'Clique para login rápido' : 'Sessão expirada - digite a senha'}
                >
                  {canQuick ? (
                    <ShieldCheck className="h-3 w-3 text-green-500" />
                  ) : (
                    <User className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className="font-mono text-[11px]">
                    ***{cred.cpf.slice(-4)}
                  </span>
                  {cred.name && (
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                      {cred.name.split(' ')[0]}
                    </span>
                  )}
                  {canQuick && timeLeft && (
                    <span className="text-[9px] text-green-400 flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {timeLeft}
                    </span>
                  )}
                  {cred.password && !canQuick && (
                    <button
                      type="button"
                      onClick={(e) => handleRemovePassword(cred.cpf, e)}
                      className="text-amber-400 hover:text-destructive transition-colors"
                      title="Sessão expirada"
                    >
                      <Key className="h-2.5 w-2.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(cred.cpf, e)}
                    className="opacity-0 group-hover:opacity-100 text-destructive/70 hover:text-destructive transition-opacity"
                    title="Remover"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-3 pt-1">
        <div className="flex items-center gap-1.5">
          <Checkbox
            id="save-cpf"
            checked={saveCpf}
            onCheckedChange={(checked) => handleSaveCpfChange(!!checked)}
            className="h-3.5 w-3.5"
          />
          <Label htmlFor="save-cpf" className="text-[10px] text-muted-foreground cursor-pointer">
            Lembrar CPF
          </Label>
        </div>
        
        <div className="flex items-center gap-1.5">
          <Checkbox
            id="save-password"
            checked={savePassword}
            disabled={!saveCpf}
            onCheckedChange={(checked) => handleSavePasswordChange(!!checked)}
            className="h-3.5 w-3.5"
          />
          <Label 
            htmlFor="save-password" 
            className={`text-[10px] cursor-pointer ${saveCpf ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}
          >
            Login rápido (3 dias)
          </Label>
        </div>
      </div>
    </div>
  );
}

