import { useState, useEffect, useCallback } from 'react';

const OFFLINE_LICENSE_STORAGE_KEY = 'plantaopro_offline_licenses';
const LAST_SYNC_KEY = 'plantaopro_license_last_sync';

export interface OfflineLicense {
  agentId: string;
  cpf: string;
  name: string;
  team: string | null;
  unitId: string | null;
  licenseStatus: string;
  licenseExpiresAt: string | null;
  cachedAt: string;
}

export interface OfflineLicenseCache {
  licenses: OfflineLicense[];
  lastSync: string | null;
  version: number;
}

export function useOfflineLicenseCache() {
  const [cache, setCache] = useState<OfflineLicenseCache>({
    licenses: [],
    lastSync: null,
    version: 1,
  });

  // Load cache from localStorage on mount
  useEffect(() => {
    loadCache();
  }, []);

  const loadCache = useCallback(() => {
    try {
      const stored = localStorage.getItem(OFFLINE_LICENSE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as OfflineLicenseCache;
        setCache(parsed);
      }
    } catch (error) {
      console.error('[OfflineLicenseCache] Error loading cache:', error);
    }
  }, []);

  const saveCache = useCallback((newCache: OfflineLicenseCache) => {
    try {
      localStorage.setItem(OFFLINE_LICENSE_STORAGE_KEY, JSON.stringify(newCache));
      localStorage.setItem(LAST_SYNC_KEY, newCache.lastSync || new Date().toISOString());
      setCache(newCache);
    } catch (error) {
      console.error('[OfflineLicenseCache] Error saving cache:', error);
    }
  }, []);

  const updateLicenses = useCallback((licenses: OfflineLicense[]) => {
    const newCache: OfflineLicenseCache = {
      licenses,
      lastSync: new Date().toISOString(),
      version: cache.version + 1,
    };
    saveCache(newCache);
  }, [cache.version, saveCache]);

  const getLicenseByCpf = useCallback((cpf: string): OfflineLicense | null => {
    const normalizedCpf = cpf.replace(/\D/g, '');
    return cache.licenses.find(l => l.cpf.replace(/\D/g, '') === normalizedCpf) || null;
  }, [cache.licenses]);

  const isLicenseValid = useCallback((license: OfflineLicense): boolean => {
    if (license.licenseStatus === 'blocked') return false;
    if (license.licenseStatus === 'expired') return false;
    
    if (license.licenseExpiresAt) {
      // Se vier só a data (YYYY-MM-DD), considerar válido até o fim do dia
      const expiresAt = /^\d{4}-\d{2}-\d{2}$/.test(license.licenseExpiresAt)
        ? new Date(`${license.licenseExpiresAt}T23:59:59.999`)
        : new Date(license.licenseExpiresAt);
      
      if (Number.isNaN(expiresAt.getTime())) return true;
      return expiresAt.getTime() >= Date.now();
    }
    
    return true;
  }, []);

  const clearCache = useCallback(() => {
    localStorage.removeItem(OFFLINE_LICENSE_STORAGE_KEY);
    localStorage.removeItem(LAST_SYNC_KEY);
    setCache({ licenses: [], lastSync: null, version: 1 });
  }, []);

  const getLastSyncTime = useCallback((): Date | null => {
    const stored = localStorage.getItem(LAST_SYNC_KEY);
    return stored ? new Date(stored) : null;
  }, []);

  return {
    cache,
    licenses: cache.licenses,
    lastSync: cache.lastSync,
    updateLicenses,
    getLicenseByCpf,
    isLicenseValid,
    clearCache,
    getLastSyncTime,
    loadCache,
  };
}

// Utility function to check offline license without hook
export function checkOfflineLicense(cpf: string): { valid: boolean; license: OfflineLicense | null; reason?: string } {
  try {
    const stored = localStorage.getItem(OFFLINE_LICENSE_STORAGE_KEY);
    if (!stored) return { valid: false, license: null, reason: 'no_cache' };
    
    const cache = JSON.parse(stored) as OfflineLicenseCache;
    const normalizedCpf = cpf.replace(/\D/g, '');
    const license = cache.licenses.find(l => l.cpf.replace(/\D/g, '') === normalizedCpf);
    
    if (!license) return { valid: false, license: null, reason: 'not_found' };
    
    // Check validity
    if (license.licenseStatus === 'blocked') {
      return { valid: false, license, reason: 'blocked' };
    }
    
    if (license.licenseStatus === 'expired') {
      return { valid: false, license, reason: 'expired' };
    }
    
    if (license.licenseExpiresAt) {
      const expiresAt = /^\d{4}-\d{2}-\d{2}$/.test(license.licenseExpiresAt)
        ? new Date(`${license.licenseExpiresAt}T23:59:59.999`)
        : new Date(license.licenseExpiresAt);
      
      if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
        return { valid: false, license, reason: 'expired' };
      }
    }
    
    return { valid: true, license };
  } catch {
    return { valid: false, license: null, reason: 'error' };
  }
}

// Check if we're online
export function isOnline(): boolean {
  return navigator.onLine;
}
