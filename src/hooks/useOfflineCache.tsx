import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface OfflineCacheConfig {
  cacheKey: string;
  expirationMinutes?: number;
}

const CACHE_PREFIX = 'plantao_offline_';
const DEFAULT_EXPIRATION_MINUTES = 60; // 1 hour

// Check if data is expired
function isExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

// Generic hook for offline caching
export function useOfflineCache<T>(config: OfflineCacheConfig) {
  const { cacheKey, expirationMinutes = DEFAULT_EXPIRATION_MINUTES } = config;
  const fullCacheKey = `${CACHE_PREFIX}${cacheKey}`;

  const saveToCache = useCallback((data: T) => {
    try {
      const cacheData: CachedData<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + expirationMinutes * 60 * 1000,
      };
      localStorage.setItem(fullCacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('[OfflineCache] Failed to save to cache:', error);
    }
  }, [fullCacheKey, expirationMinutes]);

  const getFromCache = useCallback((): T | null => {
    try {
      const cached = localStorage.getItem(fullCacheKey);
      if (!cached) return null;

      const cacheData: CachedData<T> = JSON.parse(cached);
      
      // Return data even if expired (for offline use)
      return cacheData.data;
    } catch (error) {
      console.warn('[OfflineCache] Failed to read from cache:', error);
      return null;
    }
  }, [fullCacheKey]);

  const isCacheValid = useCallback((): boolean => {
    try {
      const cached = localStorage.getItem(fullCacheKey);
      if (!cached) return false;

      const cacheData: CachedData<T> = JSON.parse(cached);
      return !isExpired(cacheData.expiresAt);
    } catch {
      return false;
    }
  }, [fullCacheKey]);

  const getCacheTimestamp = useCallback((): Date | null => {
    try {
      const cached = localStorage.getItem(fullCacheKey);
      if (!cached) return null;

      const cacheData: CachedData<T> = JSON.parse(cached);
      return new Date(cacheData.timestamp);
    } catch {
      return null;
    }
  }, [fullCacheKey]);

  const clearCache = useCallback(() => {
    localStorage.removeItem(fullCacheKey);
  }, [fullCacheKey]);

  return {
    saveToCache,
    getFromCache,
    isCacheValid,
    getCacheTimestamp,
    clearCache,
  };
}

// Hook for online/offline status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Trigger sync when coming back online
        window.dispatchEvent(new CustomEvent('app:back-online'));
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}

// Specific hook for agent shifts cache
export function useShiftsCache(agentId: string | null) {
  const cache = useOfflineCache<any[]>({
    cacheKey: `shifts_${agentId || 'unknown'}`,
    expirationMinutes: 120, // 2 hours
  });

  const { isOnline } = useNetworkStatus();

  const [shifts, setShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const fetchShifts = useCallback(async () => {
    if (!agentId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Try to fetch from network first
    if (isOnline) {
      try {
        // Bound the fetch to a useful window (last 90d + next 6 months) and
        // avoid `SELECT *` to reduce payload/latency on high-tenure agents.
        const today = new Date();
        const from = new Date(today); from.setDate(from.getDate() - 90);
        const to = new Date(today); to.setMonth(to.getMonth() + 6);
        const { data, error } = await supabase
          .from('agent_shifts')
          .select('id, shift_date, start_time, end_time, shift_type, status, notes, compensation_date, is_vacation, completed_at')
          .eq('agent_id', agentId)
          .gte('shift_date', from.toISOString().slice(0, 10))
          .lte('shift_date', to.toISOString().slice(0, 10))
          .order('shift_date', { ascending: false });

        if (!error && data) {
          setShifts(data);
          setIsFromCache(false);
          setLastSync(new Date());
          cache.saveToCache(data);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.warn('[ShiftsCache] Network fetch failed:', error);
      }
    }

    // Fallback to cache
    const cachedData = cache.getFromCache();
    if (cachedData) {
      setShifts(cachedData);
      setIsFromCache(true);
      setLastSync(cache.getCacheTimestamp());
    }

    setIsLoading(false);
  }, [agentId, isOnline, cache]);

  // Initial fetch
  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Sync when coming back online
  useEffect(() => {
    const handleBackOnline = () => {
      console.log('[ShiftsCache] Back online, syncing...');
      fetchShifts();
    };

    window.addEventListener('app:back-online', handleBackOnline);
    return () => window.removeEventListener('app:back-online', handleBackOnline);
  }, [fetchShifts]);

  return {
    shifts,
    isLoading,
    isFromCache,
    lastSync,
    refetch: fetchShifts,
  };
}

// Hook for team members cache
export function useTeamMembersCache(unitId: string | null, team: string | null) {
  const cache = useOfflineCache<any[]>({
    cacheKey: `team_${unitId || 'unknown'}_${team || 'unknown'}`,
    expirationMinutes: 60,
  });

  const { isOnline } = useNetworkStatus();

  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!unitId || !team) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('unit_id', unitId)
          .eq('team', team)
          .eq('is_active', true)
          .order('name');

        if (!error && data) {
          setMembers(data);
          setIsFromCache(false);
          setLastSync(new Date());
          cache.saveToCache(data);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.warn('[TeamCache] Network fetch failed:', error);
      }
    }

    const cachedData = cache.getFromCache();
    if (cachedData) {
      setMembers(cachedData);
      setIsFromCache(true);
      setLastSync(cache.getCacheTimestamp());
    }

    setIsLoading(false);
  }, [unitId, team, isOnline, cache]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    const handleBackOnline = () => {
      fetchMembers();
    };

    window.addEventListener('app:back-online', handleBackOnline);
    return () => window.removeEventListener('app:back-online', handleBackOnline);
  }, [fetchMembers]);

  return {
    members,
    isLoading,
    isFromCache,
    lastSync,
    refetch: fetchMembers,
  };
}

// Hook for events cache
export function useEventsCache(agentId: string | null) {
  const cache = useOfflineCache<any[]>({
    cacheKey: `events_${agentId || 'unknown'}`,
    expirationMinutes: 60,
  });

  const { isOnline } = useNetworkStatus();

  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!agentId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('agent_events')
          .select('*')
          .eq('agent_id', agentId)
          .order('event_date', { ascending: true });

        if (!error && data) {
          setEvents(data);
          setIsFromCache(false);
          setLastSync(new Date());
          cache.saveToCache(data);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.warn('[EventsCache] Network fetch failed:', error);
      }
    }

    const cachedData = cache.getFromCache();
    if (cachedData) {
      setEvents(cachedData);
      setIsFromCache(true);
      setLastSync(cache.getCacheTimestamp());
    }

    setIsLoading(false);
  }, [agentId, isOnline, cache]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const handleBackOnline = () => {
      fetchEvents();
    };

    window.addEventListener('app:back-online', handleBackOnline);
    return () => window.removeEventListener('app:back-online', handleBackOnline);
  }, [fetchEvents]);

  return {
    events,
    isLoading,
    isFromCache,
    lastSync,
    refetch: fetchEvents,
  };
}

// Clear all offline caches
export function clearAllOfflineCache() {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(CACHE_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}
