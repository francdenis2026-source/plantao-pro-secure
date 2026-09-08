import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getSavedCredentials, 
  saveCredential as saveCredentialLocal,
  updateLastLogin as updateLastLoginLocal,
  removeCredential as removeCredentialLocal,
  clearAllCredentials as clearAllCredentialsLocal
} from '@/components/auth/SavedCredentials';

// Generate a unique device ID
const getDeviceId = (): string => {
  const key = 'plantao_device_id';
  let deviceId = localStorage.getItem(key);
  if (!deviceId) {
    deviceId = `${navigator.userAgent.slice(0, 20)}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, deviceId);
  }
  return deviceId;
};

// Simple encryption (client-side only - for obfuscation, not security)
const encrypt = (text: string): string => {
  const key = getDeviceId().slice(0, 16);
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
};

const decrypt = (encoded: string): string => {
  try {
    const key = getDeviceId().slice(0, 16);
    const decoded = atob(encoded);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    return '';
  }
};

interface SavedCredentialDB {
  id: string;
  agent_id: string;
  cpf: string;
  name: string | null;
  encrypted_token: string | null;
  device_id: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useSavedCredentialsSync() {
  const { user } = useAuth();
  const syncedRef = useRef(false);
  const deviceId = getDeviceId();

  // Sync from database to localStorage on login
  const syncFromDatabase = useCallback(async () => {
    if (!user || syncedRef.current) return;
    
    try {
      const { data, error } = await supabase
        .from('saved_credentials')
        .select('*')
        .eq('device_id', deviceId);

      if (error) {
        console.error('Error fetching saved credentials:', error);
        return;
      }

      if (data && data.length > 0) {
        const localCreds = getSavedCredentials();
        
        // Merge database credentials with local ones
        (data as SavedCredentialDB[]).forEach((dbCred) => {
          const existsLocally = localCreds.some(c => c.cpf === dbCred.cpf);
          if (!existsLocally && dbCred.encrypted_token) {
            const password = decrypt(dbCred.encrypted_token);
            if (password) {
              saveCredentialLocal(dbCred.cpf, dbCred.name || undefined, password);
            }
          }
        });
      }
      
      syncedRef.current = true;
    } catch (err) {
      console.error('Sync from database failed:', err);
    }
  }, [user, deviceId]);

  // Parse user agent for device info
  const getDeviceInfo = useCallback(() => {
    const ua = navigator.userAgent;
    
    let browser = 'Navegador';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    
    let os = 'Sistema';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    
    return { browser, os };
  }, []);

  // Sync to database when saving credentials
  const syncToDatabase = useCallback(async (cpf: string, name?: string, password?: string) => {
    if (!user) return;
    
    try {
      // Get agent_id from CPF
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('cpf', cpf.replace(/\D/g, ''))
        .single();

      if (!agent) return;

      const encryptedToken = password ? encrypt(password) : null;
      const { browser, os } = getDeviceInfo();

      await supabase
        .from('saved_credentials')
        .upsert({
          agent_id: agent.id,
          cpf: cpf.replace(/\D/g, ''),
          name,
          encrypted_token: encryptedToken,
          device_id: deviceId,
          last_login_at: new Date().toISOString(),
          browser,
          os,
          is_active: true
        }, {
          onConflict: 'agent_id,device_id'
        });
    } catch (err) {
      console.error('Sync to database failed:', err);
    }
  }, [user, deviceId]);

  // Update last login in database
  const updateLastLoginDB = useCallback(async (cpf: string) => {
    if (!user) return;
    
    try {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('cpf', cpf.replace(/\D/g, ''))
        .single();

      if (!agent) return;

      await supabase
        .from('saved_credentials')
        .update({ last_login_at: new Date().toISOString() })
        .eq('agent_id', agent.id)
        .eq('device_id', deviceId);
    } catch (err) {
      console.error('Update last login failed:', err);
    }
  }, [user, deviceId]);

  // Remove credential from database
  const removeFromDatabase = useCallback(async (cpf: string) => {
    if (!user) return;
    
    try {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('cpf', cpf.replace(/\D/g, ''))
        .single();

      if (!agent) return;

      await supabase
        .from('saved_credentials')
        .delete()
        .eq('agent_id', agent.id)
        .eq('device_id', deviceId);
    } catch (err) {
      console.error('Remove from database failed:', err);
    }
  }, [user, deviceId]);

  // Clear all credentials from database for this device
  const clearAllFromDatabase = useCallback(async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('saved_credentials')
        .delete()
        .eq('device_id', deviceId);
    } catch (err) {
      console.error('Clear all from database failed:', err);
    }
  }, [user, deviceId]);

  // Sync from database on mount
  useEffect(() => {
    syncFromDatabase();
  }, [syncFromDatabase]);

  // Wrapper functions that sync both local and database
  const saveCredential = useCallback((cpf: string, name?: string, password?: string) => {
    saveCredentialLocal(cpf, name, password);
    syncToDatabase(cpf, name, password);
  }, [syncToDatabase]);

  const updateLastLogin = useCallback((cpf: string) => {
    updateLastLoginLocal(cpf);
    updateLastLoginDB(cpf);
  }, [updateLastLoginDB]);

  const removeCredential = useCallback((cpf: string) => {
    removeCredentialLocal(cpf);
    removeFromDatabase(cpf);
  }, [removeFromDatabase]);

  const clearAllCredentials = useCallback(() => {
    clearAllCredentialsLocal();
    clearAllFromDatabase();
  }, [clearAllFromDatabase]);

  return {
    saveCredential,
    updateLastLogin,
    removeCredential,
    clearAllCredentials,
    syncFromDatabase
  };
}
