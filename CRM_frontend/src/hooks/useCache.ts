import { useEffect, useState, useCallback } from 'react';
import { apiCache } from '../utils/cache';

/**
 * Hook to fetch data with automatic caching
 * Reduces redundant API calls during development
 */
export const useCache = <T,>(
  cacheKey: string,
  fetchFn: () => Promise<any>,
  options?: {
    skipCache?: boolean;
    ttl?: number;
  }
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    // Check cache first (unless skipped)
    if (!options?.skipCache) {
      const cached = apiCache.get<T>(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }

    // Cache miss, fetch from API
    try {
      setLoading(true);
      const response = await fetchFn();
      const result = response.data || response;
      
      // Cache the result
      apiCache.set(cacheKey, result, options?.ttl);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetchFn, options]);

  useEffect(() => {
    fetchData();
  }, [cacheKey]);

  // Return refetch function to manually refresh
  return { data, loading, error, refetch: fetchData };
};

/**
 * Hook to fetch multiple resources with parallel caching
 */
export const useCacheMultiple = <T extends Record<string, any>>(
  requests: Record<keyof T, { key: string; fn: () => Promise<any> }>,
  options?: { ttl?: number; skipCache?: boolean }
) => {
  const [data, setData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const results: Partial<T> = {};
        
        const promises = Object.entries(requests).map(async ([key, { key: cacheKey, fn }]) => {
          // Check cache first
          if (!options?.skipCache) {
            const cached = apiCache.get(cacheKey);
            if (cached) {
              results[key as keyof T] = cached as any;
              return;
            }
          }

          // Fetch if not cached
          const response = await fn();
          const result = response.data || response;
          apiCache.set(cacheKey, result, options?.ttl);
          results[key as keyof T] = result;
        });

        await Promise.all(promises);
        setData(results);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setData({});
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return { data, loading, error };
};
