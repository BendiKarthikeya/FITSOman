/**
 * Cache Manager - Centralized cache invalidation and management
 * Used to invalidate and refetch data from database across the application
 */

import { queryClient } from "./queryClient";

export class CacheManager {
  private static lastRefreshAt = 0;
  private static readonly refreshIntervalMs = 10 * 60 * 1000;
  /**
   * Invalidate all survey-related caches
   * Call after creating, updating, or deleting surveys
   */
  static invalidateSurveys() {
    
    queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
  }

  /**
   * Invalidate survey by ID
   */
  static invalidateSurveyById(surveyId: string) {
    
    queryClient.invalidateQueries({ queryKey: ["/api/surveys", surveyId] });
    this.invalidateSurveys();
  }

  /**
   * Invalidate all response-related caches
   * Call after creating, updating, or deleting responses
   */
  static invalidateResponses() {
    
    queryClient.invalidateQueries({ queryKey: ["/api/responses"] });
  }

  /**
   * Invalidate responses by survey ID
   */
  static invalidateResponsesBySurveyId(surveyId: string) {
    
    queryClient.invalidateQueries({ queryKey: ["/api/responses", { surveyId }] });
    this.invalidateResponses();
  }

  /**
   * Invalidate all analytics caches
   * Call after data changes that affect analytics
   */
  static invalidateAnalytics() {
    
    queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    queryClient.invalidateQueries({ queryKey: ["/api/unified-analytics/metrics"] });
    queryClient.invalidateQueries({ queryKey: ["/api/advanced-analytics"] });
  }

  /**
   * Invalidate unified analytics for specific date range
   */
  static invalidateUnifiedAnalytics(dateRange?: string) {
    
    if (dateRange) {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/unified-analytics/metrics", dateRange],
        exact: true
      });
    } else {
      // Invalidate all date ranges
      queryClient.invalidateQueries({ queryKey: ["/api/unified-analytics/metrics"] });
    }
  }

  /**
   * Invalidate action plans caches
   */
  static invalidateActionPlans() {
    
    queryClient.invalidateQueries({ queryKey: ["/api/action-plans"] });
    queryClient.invalidateQueries({ queryKey: ["/api/action-plans/status"] });
  }

  /**
   * Invalidate action plans by survey ID
   */
  static invalidateActionPlansBySurveyId(surveyId: string) {
    
    queryClient.invalidateQueries({ queryKey: ["/api/action-plans", surveyId] });
    this.invalidateActionPlans();
  }

  /**
   * Invalidate audit logs caches
   */
  static invalidateAuditLogs() {
    
    queryClient.invalidateQueries({ queryKey: ["/api/audit-logs"] });
  }

  /**
   * Invalidate user-related caches
   */
  static invalidateUsers() {
    
    queryClient.invalidateQueries({ queryKey: ["/api/users"] });
  }

  /**
   * Invalidate organization caches
   */
  static invalidateOrganizations() {
    
    queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
  }

  /**
   * Invalidate RBAC/permissions caches
   */
  static invalidatePermissions() {
    
    queryClient.invalidateQueries({ queryKey: ["/api/rbac"] });
    queryClient.invalidateQueries({ queryKey: ["/api/permissions"] });
  }

  /**
   * Invalidate CRM configuration caches
   */
  static invalidateCrmConfig() {
    
    queryClient.invalidateQueries({ queryKey: ["/api/crm-configs"] });
  }

  /**
   * Invalidate department caches
   */
  static invalidateDepartments() {
    
    queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
  }

  /**
   * Invalidate session caches
   */
  static invalidateSessions() {
    
    queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
  }

  /**
   * Clear ALL caches - use sparingly
   * Called on logout or major state reset
   */
  static clearAllCaches() {
    
    queryClient.clear();
  }

  /**
   * Invalidate ALL related caches after data mutation
   * Use this for major data changes
   */
  static invalidateEverything() {
    
    this.invalidateSurveys();
    this.invalidateResponses();
    this.invalidateAnalytics();
    this.invalidateActionPlans();
    this.invalidateUsers();
    this.invalidateAuditLogs();
  }

  /**
   * Thread-safe cache refresh
   * Waits for invalidation to complete before refetching
   */
  static async refreshAll(force = false) {
    const now = Date.now();
    if (!force && now - this.lastRefreshAt < this.refreshIntervalMs) {
      return;
    }

    this.lastRefreshAt = now;
    console.log("[CacheManager] 🔃 Refreshing all caches from database...");
    await this.invalidateEverything();
    // Refetch specific essential queries
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ["/api/surveys"], type: "active" }),
      queryClient.refetchQueries({ queryKey: ["/api/unified-analytics/metrics"], type: "active" }),
      queryClient.refetchQueries({ queryKey: ["/api/action-plans"], type: "active" }),
    ]).catch(err => {});
  }

  /**
   * Setup automatic cache validation on window focus
   * Refreshes data when user returns to tab
   */
  static setupAutoRefresh() {
    const handleFocus = async () => {
      
      await this.refreshAll();
    };

    window.addEventListener("focus", handleFocus);
    
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }

  /**
   * Setup automatic cache invalidation on visibility change
   * Refetches data when user returns from tab switch
   */
  static setupVisibilityListener() {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        
        this.refreshAll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }

  /**
   * Setup periodic cache refresh
   * Refetches critical data every N milliseconds
   */
  static setupPeriodicRefresh(intervalMs: number = 300000) { // 5 minutes default
    
    
    const interval = setInterval(() => {
      
      // Light refresh - only update active queries
      queryClient.refetchQueries({ type: "active" });
    }, intervalMs);

    return () => clearInterval(interval);
  }

  /**
   * Get current cache status
   */
  static getCacheStatus() {
    return {
      surveys: queryClient.getQueryState(["/api/surveys"]),
      responses: queryClient.getQueryState(["/api/responses"]),
      analyticsMetrics: queryClient.getQueryState(["/api/unified-analytics/metrics"]),
      actionPlans: queryClient.getQueryState(["/api/action-plans"]),
    };
  }

  /**
   * Reset cache entry while keeping others
   */
  static resetCacheEntry(queryKey: any[]) {
    
    queryClient.resetQueries({ queryKey });
  }
}

// Auto-setup cache listeners on import
if (typeof window !== "undefined") {
  // Setup auto-refresh on focus
  CacheManager.setupAutoRefresh();
  
  // Setup visibility listener
  CacheManager.setupVisibilityListener();
  
  // Setup periodic refresh every 5 minutes
  CacheManager.setupPeriodicRefresh(300000);
}
