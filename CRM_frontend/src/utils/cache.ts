/**
 * Simple cache system to avoid redundant API calls during development
 * Cache entries expire after 5 minutes (300000ms) or on manual invalidation
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data if valid and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Set cache data with optional TTL
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Clear specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear cache entries by prefix (e.g., all "students" related cache)
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics (useful for debugging)
   */
  getStats() {
    return {
      totalEntries: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        expiresIn: Math.round((value.expiresAt - Date.now()) / 1000) + 's',
      })),
    };
  }
}

// Export singleton instance
export const apiCache = new CacheManager();

// Preload common queries to warm up cache on app startup
export const preloadCommonCache = async (apis: any) => {
  try {
    // Optional: Add timeout to avoid blocking app startup
    setTimeout(async () => {
      try {
        const [teachers, centers, classes] = await Promise.all([
          apis.teacherAPI.getAll(),
          apis.centerAPI.getAll(),
          apis.classAPI.getAll(),
        ]);
        
        apiCache.set('teachers', teachers.data);
        apiCache.set('centers', centers.data);
        apiCache.set('classes', classes.data);
      } catch (error) {
        console.debug('Optional cache preload failed:', error);
      }
    }, 2000); // Wait 2 seconds before preloading
  } catch (error) {
    console.debug('Cache preload skipped:', error);
  }
};
