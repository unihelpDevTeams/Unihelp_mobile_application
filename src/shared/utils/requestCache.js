/**
 * Request Deduplication Cache
 * 
 * Prevents duplicate concurrent requests for the same data.
 * If multiple components request the same data simultaneously,
 * they all receive the same promise and result.
 * 
 * Example:
 *   const result1 = await cachedRequest('fetchNotes', () => fetchNotes());
 *   const result2 = await cachedRequest('fetchNotes', () => fetchNotes());
 *   // Both requests use the same promise, reducing API calls
 */

class RequestCache {
  constructor() {
    this.pendingRequests = new Map(); // key -> Promise
    this.cachedResults = new Map(); // key -> { data, timestamp }
    this.cacheTTL = {}; // key -> ttl in milliseconds
  }

  /**
   * Execute a request with deduplication and optional caching
   * @param {string} key - Unique cache key
   * @param {Function} requestFn - Async function that returns the data
   * @param {number} ttlMs - Cache time-to-live in milliseconds (optional)
   * @returns {Promise} Result of the request
   */
  async dedupedRequest(key, requestFn, ttlMs = 0) {
    // Check if result is cached and still valid
    if (this.cachedResults.has(key)) {
      const cached = this.cachedResults.get(key);
      const age = Date.now() - cached.timestamp;
      const ttl = this.cacheTTL[key] || 0;

      if (age < ttl) {
        return cached.data;
      } else {
        // Cache expired, remove it
        this.cachedResults.delete(key);
      }
    }

    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Create new request promise
    const promise = requestFn()
      .then((data) => {
        // Cache the result if TTL is specified
        if (ttlMs > 0) {
          this.cachedResults.set(key, { data, timestamp: Date.now() });
          this.cacheTTL[key] = ttlMs;
        }
        return data;
      })
      .finally(() => {
        // Remove from pending once complete
        this.pendingRequests.delete(key);
      });

    // Track this pending request
    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Clear all cached data and pending requests
   */
  clear() {
    this.pendingRequests.clear();
    this.cachedResults.clear();
    this.cacheTTL = {};
  }

  /**
   * Clear cache for a specific key
   */
  clearKey(key) {
    this.cachedResults.delete(key);
    delete this.cacheTTL[key];
  }

  /**
   * Clear all cached results (but keep pending requests)
   */
  clearCache() {
    this.cachedResults.clear();
    this.cacheTTL = {};
  }
}

// Singleton instance
const requestCache = new RequestCache();

export default requestCache;

/**
 * Convenient wrapper function for deduped requests
 * 
 * Usage:
 *   import { cachedRequest } from './requestCache';
 *   
 *   // Without caching (dedup only)
 *   const notes = await cachedRequest('fetchNotes', () => fetchNotes());
 *   
 *   // With 5-minute cache
 *   const formulas = await cachedRequest(
 *     'fetchFormulas',
 *     () => fetchFormulas(),
 *     5 * 60 * 1000 // 5 minutes
 *   );
 */
export async function cachedRequest(key, requestFn, ttlMs = 0) {
  return requestCache.dedupedRequest(key, requestFn, ttlMs);
}
