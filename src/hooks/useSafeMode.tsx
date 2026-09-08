import { useState, useEffect, useCallback } from 'react';

const SAFE_MODE_KEY = 'plantaopro_safe_mode';
const SAFE_MODE_EXPIRY_KEY = 'plantaopro_safe_mode_expiry';

interface SafeModeConfig {
  /** Duration in milliseconds for safe mode to auto-disable */
  duration?: number;
  /** Callback when safe mode is enabled */
  onEnable?: () => void;
  /** Callback when safe mode is disabled */
  onDisable?: () => void;
}

export function useSafeMode(config: SafeModeConfig = {}) {
  const { 
    duration = 30 * 60 * 1000, // 30 minutes default
    onEnable,
    onDisable 
  } = config;

  const [isSafeMode, setIsSafeMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    
    const stored = localStorage.getItem(SAFE_MODE_KEY);
    const expiry = localStorage.getItem(SAFE_MODE_EXPIRY_KEY);
    
    if (stored === 'true' && expiry) {
      const expiryTime = parseInt(expiry, 10);
      if (Date.now() < expiryTime) {
        return true;
      }
      // Expired, clean up
      localStorage.removeItem(SAFE_MODE_KEY);
      localStorage.removeItem(SAFE_MODE_EXPIRY_KEY);
    }
    return false;
  });

  const [expiresAt, setExpiresAt] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const expiry = localStorage.getItem(SAFE_MODE_EXPIRY_KEY);
    return expiry ? parseInt(expiry, 10) : null;
  });

  // Check expiry periodically
  useEffect(() => {
    if (!isSafeMode || !expiresAt) return;

    const interval = setInterval(() => {
      if (Date.now() >= expiresAt) {
        disableSafeMode();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSafeMode, expiresAt]);

  const enableSafeMode = useCallback(async () => {
    console.log('[SafeMode] Enabling safe mode...');
    
    try {
      // 1. Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
        console.log('[SafeMode] Service workers unregistered');
      }

      // 2. Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[SafeMode] Caches cleared');
      }

      // 3. Clear offline cache from localStorage (but not auth data)
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('offline_cache_') ||
          key.startsWith('plantaopro_cache_')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('[SafeMode] Offline cache cleared');

      // 4. Set safe mode flag with expiry
      const expiryTime = Date.now() + duration;
      localStorage.setItem(SAFE_MODE_KEY, 'true');
      localStorage.setItem(SAFE_MODE_EXPIRY_KEY, expiryTime.toString());
      
      setIsSafeMode(true);
      setExpiresAt(expiryTime);
      
      onEnable?.();
      console.log('[SafeMode] Safe mode enabled until', new Date(expiryTime));
      
    } catch (error) {
      console.error('[SafeMode] Error enabling safe mode:', error);
    }
  }, [duration, onEnable]);

  const disableSafeMode = useCallback(() => {
    console.log('[SafeMode] Disabling safe mode...');
    
    localStorage.removeItem(SAFE_MODE_KEY);
    localStorage.removeItem(SAFE_MODE_EXPIRY_KEY);
    
    setIsSafeMode(false);
    setExpiresAt(null);
    
    onDisable?.();
    
    // Reload to re-register service worker
    window.location.reload();
  }, [onDisable]);

  const getTimeRemaining = useCallback(() => {
    if (!expiresAt) return null;
    return Math.max(0, expiresAt - Date.now());
  }, [expiresAt]);

  return {
    isSafeMode,
    expiresAt,
    enableSafeMode,
    disableSafeMode,
    getTimeRemaining,
  };
}
