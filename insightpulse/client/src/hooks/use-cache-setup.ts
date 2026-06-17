/**
 * Hook to setup cache management on component mount
 * Should be called once at the app level (e.g., in Layout or App component)
 */

import { useEffect } from 'react';
import { CacheManager } from '@/lib/cacheManager';

export function useCacheSetup() {
  useEffect(() => {
    

    // Setup visibility listener (already done in CacheManager, but we can add additional logic here)
    const unsubscribeVisibility = CacheManager.setupVisibilityListener();

    // Setup focus listener
    const unsubscribeFocus = CacheManager.setupAutoRefresh();

    // Setup periodic refresh
    const unsubscribeRefresh = CacheManager.setupPeriodicRefresh(300000); // 5 minutes

    // Log cache status on mount
    

    // Cleanup listeners on unmount
    return () => {
      
      unsubscribeVisibility();
      unsubscribeFocus();
      unsubscribeRefresh();
    };
  }, []);

  /**
   * Manual cache refresh function
   * Can be called to refresh all caches on demand
   */
  const refreshCache = async () => {
    
    await CacheManager.refreshAll();
  };

  /**
   * Clear all caches
   * Use after logout
   */
  const clearCache = () => {
    
    CacheManager.clearAllCaches();
  };

  return {
    refreshCache,
    clearCache,
    getCacheStatus: () => CacheManager.getCacheStatus(),
  };
}

export default useCacheSetup;
