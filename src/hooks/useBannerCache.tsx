import { useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_DURATION_MS = 30 * 1000; // 30 seconds

// Global cache storage (persists across component mounts)
const globalCache = new Map<string, CacheEntry<any>>();

export function useBannerCache<T>(cacheKey: string) {
  const lastFetchRef = useRef<number>(0);

  const getCachedData = useCallback((): T | null => {
    const entry = globalCache.get(cacheKey);
    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age < CACHE_DURATION_MS) {
      return entry.data as T;
    }

    // Cache expired, remove it
    globalCache.delete(cacheKey);
    return null;
  }, [cacheKey]);

  const setCachedData = useCallback((data: T) => {
    const now = Date.now();
    globalCache.set(cacheKey, {
      data,
      timestamp: now,
    });
    lastFetchRef.current = now;
  }, [cacheKey]);

  const isCacheValid = useCallback((): boolean => {
    const entry = globalCache.get(cacheKey);
    if (!entry) return false;

    const now = Date.now();
    return (now - entry.timestamp) < CACHE_DURATION_MS;
  }, [cacheKey]);

  const clearCache = useCallback(() => {
    globalCache.delete(cacheKey);
    lastFetchRef.current = 0;
  }, [cacheKey]);

  const getCacheAge = useCallback((): number => {
    const entry = globalCache.get(cacheKey);
    if (!entry) return -1;
    return Date.now() - entry.timestamp;
  }, [cacheKey]);

  return {
    getCachedData,
    setCachedData,
    isCacheValid,
    clearCache,
    getCacheAge,
    CACHE_DURATION_MS,
  };
}
