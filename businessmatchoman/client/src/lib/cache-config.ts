/**
 * Cache Configuration for TEEJARTI Platform
 * Comprehensive caching strategy for optimal performance
 */

// Query cache configurations
export const CACHE_TIMES = {
  // Very short cache - frequently changing data
  USER_SESSION: 30 * 1000, // 30 seconds

  // Short cache - moderate frequency updates
  LISTINGS_FEATURED: 2 * 60 * 1000, // 2 minutes
  LISTINGS_SEARCH: 1 * 60 * 1000, // 1 minute
  USER_PROFILE: 5 * 60 * 1000, // 5 minutes

  // Medium cache - stable data
  SETTINGS: 15 * 60 * 1000, // 15 minutes
  CATEGORIES: 30 * 60 * 1000, // 30 minutes
  SUCCESS_STORIES: 30 * 60 * 1000, // 30 minutes

  // Long cache - rarely changing data
  STATIC_CONTENT: 60 * 60 * 1000, // 1 hour
  COMPANY_INFO: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Stale time configurations (how long data is considered fresh)
export const STALE_TIMES = {
  USER_SESSION: 10 * 1000, // 10 seconds
  LISTINGS_FEATURED: 30 * 1000, // 30 seconds
  LISTINGS_SEARCH: 20 * 1000, // 20 seconds
  USER_PROFILE: 2 * 60 * 1000, // 2 minutes
  SETTINGS: 5 * 60 * 1000, // 5 minutes
  CATEGORIES: 10 * 60 * 1000, // 10 minutes
  SUCCESS_STORIES: 10 * 60 * 1000, // 10 minutes
  STATIC_CONTENT: 30 * 60 * 1000, // 30 minutes
  COMPANY_INFO: 6 * 60 * 60 * 1000, // 6 hours
} as const;

// Browser cache headers
export const BROWSER_CACHE_HEADERS = {
  IMAGES: "public, max-age=31536000, immutable", // 1 year
  STATIC_ASSETS: "public, max-age=31536000, immutable", // 1 year
  API_SHORT: "public, max-age=60, s-maxage=60", // 1 minute
  API_MEDIUM: "public, max-age=300, s-maxage=300", // 5 minutes
  API_LONG: "public, max-age=1800, s-maxage=1800", // 30 minutes
} as const;

// Memory cache for frequently accessed data
class MemoryCache {
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();

  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // Clean up expired entries periodically
    this.cleanup();
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      totalMemory: JSON.stringify(Array.from(this.cache.entries())).length,
    };
  }
}

export const memoryCache = new MemoryCache();

// Cache key generators
export const CACHE_KEYS = {
  user: () => ["/api/user"],
  userProfile: (userId: string) => ["/api/users", userId],
  listings: (params?: any) => ["/api/listings", params],
  listingDetail: (id: string) => ["/api/listings", id],
  listingSimilar: (id: string) => ["/api/listings", id, "similar"],
  listingDocuments: (id: string) => ["/api/listings", id, "documents"],
  listingsFeatured: () => ["/api/listings/featured"],
  listingsSearch: (params: any) => ["/api/listings/search", params],
  listingsCounts: () => ["/api/listings/counts-by-category"],
  settings: () => ["/api/settings"],
  successStories: () => ["/api/success-stories"],
  categories: () => ["/api/categories"],
  kycStatus: (userId: string) => ["/api/kyc", userId],
} as const;

// Prefetch strategies
export const PREFETCH_CONFIG = {
  // Prefetch featured listings on homepage load
  HOMEPAGE_PREFETCH: [
    CACHE_KEYS.listingsFeatured(),
    CACHE_KEYS.listingsCounts(),
    CACHE_KEYS.settings(),
  ],

  // Prefetch related data on listing details page
  LISTING_DETAIL_PREFETCH: (listingId: string) => [
    CACHE_KEYS.listingSimilar(listingId),
    CACHE_KEYS.listingDocuments(listingId),
  ],
} as const;

// Image cache configuration
export const IMAGE_CACHE_CONFIG = {
  LAZY_LOAD_THRESHOLD: "200px",
  CACHE_SIZE: 50, // Number of images to keep in memory
  QUALITY_SETTINGS: {
    thumbnail: 60,
    preview: 80,
    full: 90,
  },
  FORMATS: ["webp", "jpg", "png"] as const,
} as const;
