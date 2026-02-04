/**
 * QUICK START: How to optimize your page components with caching
 * 
 * Copy-paste this template and adapt to your needs
 */

// Example 1: Using cache in a component
/*
import { useState, useEffect } from 'react';
import { useCacheMultiple } from '../hooks/useCache';
import { apiCache } from '../utils/cache';

const MyComponent = () => {
  const { data, loading } = useCacheMultiple({
    students: { key: 'students', fn: () => studentAPI.getAll() },
    teachers: { key: 'teachers', fn: () => teacherAPI.getAll() },
    classes: { key: 'classes', fn: () => classAPI.getAll() },
  });

  if (loading) return <div>Loading...</div>;

  return <div>Data loaded</div>;
};
*/

// Example 2: With cache invalidation after mutations
/*
const handleAddStudent = async (studentData: any) => {
  try {
    await studentAPI.create(studentData);
    apiCache.invalidate('students'); // Clear cache
    // Optionally refetch immediately
  } catch (error) {
    console.error(error);
  }
};
*/

// Example 3: Using debounce for search
/*
import { debounce } from '../utils/performance';

const handleSearch = debounce((term: string) => {
  performSearch(term);
}, 300);

// In JSX:
// <input onChange={(e) => handleSearch(e.target.value)} />
*/

/**
 * IMPORTANT: Cache invalidation strategy
 * 
 * After CREATE/UPDATE/DELETE operations:
 * 
 * 1. Single resource type:
 *    apiCache.invalidate('students');
 * 
 * 2. Multiple related resources:
 *    apiCache.invalidatePrefix('student');
 * 
 * 3. Everything:
 *    apiCache.clear();
 * 
 * RULE: Always clear cache AFTER mutation completes
 */

/**
 * PERFORMANCE CHECKLIST:
 * 
 * ✅ Are you fetching the same data on multiple pages?
 *    → Use cache hooks instead
 * 
 * ✅ Are dropdowns/selects repeating API calls?
 *    → Implement caching with useCacheMultiple
 * 
 * ✅ Do you have search/filter inputs?
 *    → Use debounce to limit API calls
 * 
 * ✅ After adding/editing data?
 *    → Clear relevant cache with apiCache.invalidate()
 * 
 * ✅ Are heavy components rendering unnecessarily?
 *    → Wrap with React.memo()
 */

/**
 * TESTING CACHE:
 * 
 * In browser console:
 * 
 * // View all cached data
 * import { apiCache } from './utils/cache';
 * console.log(apiCache.getStats());
 * 
 * // Clear specific cache
 * apiCache.invalidate('students');
 * 
 * // Clear all
 * apiCache.clear();
 */
