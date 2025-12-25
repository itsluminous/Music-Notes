/**
 * Integration Tests for Error Scenarios
 * 
 * Tests error handling in useNotesData hook including:
 * - localStorage disabled scenario
 * - Network failure during incremental fetch
 * - Corrupted cache scenario
 * - localStorage quota exceeded
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as cacheManager from '@/lib/cache-manager';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  let disabled = false;
  let quotaExceeded = false;

  return {
    getItem: (key: string) => {
      if (disabled) throw new Error('localStorage is disabled');
      return store[key] || null;
    },
    setItem: (key: string, value: string) => {
      if (disabled) throw new Error('localStorage is disabled');
      if (quotaExceeded) {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      }
      store[key] = value;
    },
    removeItem: (key: string) => {
      if (disabled) throw new Error('localStorage is disabled');
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    setDisabled: (value: boolean) => {
      disabled = value;
    },
    setQuotaExceeded: (value: boolean) => {
      quotaExceeded = value;
    },
  };
})();

describe('Error Scenarios Integration Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.setDisabled(false);
    localStorageMock.setQuotaExceeded(false);
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('localStorage disabled scenario', () => {
    /**
     * Test localStorage disabled scenario
     * 
     * When localStorage is disabled, the application should:
     * 1. Detect that localStorage is unavailable
     * 2. Skip cache operations
     * 3. Return null from getCachedData
     * 4. Continue functioning normally without caching
     */
    it('should handle localStorage being disabled gracefully', () => {
      // Disable localStorage
      localStorageMock.setDisabled(true);

      // Attempt to get cached data
      const result = cacheManager.getCachedData();
      
      // Should return null without crashing
      expect(result).toBeNull();
    });

    it('should handle localStorage write failure when disabled', () => {
      // Disable localStorage
      localStorageMock.setDisabled(true);

      const mockData: cacheManager.CachedData = {
        notes: [],
        tags: [],
        noteTags: [],
        metadata: cacheManager.createCacheMetadata('2024-01-01T00:00:00Z'),
      };

      // Attempt to write to cache
      const result = cacheManager.setCachedData(mockData);
      
      // Should return false indicating failure
      expect(result).toBe(false);
    });
  });

  describe('Corrupted cache scenario', () => {
    /**
     * Test corrupted cache scenario
     * 
     * When cache contains corrupted data:
     * 1. Cache should be detected as invalid
     * 2. Cache should be cleared
     * 3. getCachedData should return null
     * 4. Application should continue functioning
     */
    it('should clear corrupted cache and return null', () => {
      // Set corrupted cache data
      localStorage.setItem('music-notes-cache', 'invalid json {{{');

      // Attempt to get cached data
      const result = cacheManager.getCachedData();
      
      // Should return null
      expect(result).toBeNull();

      // Cache should have been cleared
      expect(localStorage.getItem('music-notes-cache')).toBeNull();
    });

    it('should handle cache with missing required fields', () => {
      // Set cache with invalid structure
      const invalidData = {
        notes: [],
        // missing tags, noteTags, and metadata
      };

      localStorage.setItem('music-notes-cache', JSON.stringify(invalidData));

      // Attempt to get cached data
      const result = cacheManager.getCachedData();
      
      // Should return null
      expect(result).toBeNull();

      // Cache should have been cleared
      expect(localStorage.getItem('music-notes-cache')).toBeNull();
    });
  });

  describe('localStorage quota exceeded', () => {
    /**
     * Test localStorage quota exceeded scenario
     * 
     * When localStorage quota is exceeded:
     * 1. Cache write should fail gracefully
     * 2. setCachedData should return false
     * 3. Application should continue functioning
     * 4. Retry mechanism should attempt to clear and retry
     */
    it('should handle quota exceeded error gracefully', () => {
      // Enable quota exceeded error
      localStorageMock.setQuotaExceeded(true);

      const mockData: cacheManager.CachedData = {
        notes: [],
        tags: [],
        noteTags: [],
        metadata: cacheManager.createCacheMetadata('2024-01-01T00:00:00Z'),
      };

      // Attempt to write to cache
      const result = cacheManager.setCachedData(mockData);
      
      // Should return false indicating failure
      expect(result).toBe(false);
    });

    it('should retry after clearing cache when quota exceeded', () => {
      // Mock setItem to throw QuotaExceededError on first call, succeed on second
      let callCount = 0;
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn((key: string, value: string) => {
        callCount++;
        if (callCount === 1) {
          const error = new Error('QuotaExceededError');
          error.name = 'QuotaExceededError';
          throw error;
        }
        originalSetItem.call(localStorage, key, value);
      });

      const mockData: cacheManager.CachedData = {
        notes: [],
        tags: [],
        noteTags: [],
        metadata: cacheManager.createCacheMetadata('2024-01-01T00:00:00Z'),
      };

      // Attempt to write to cache
      const result = cacheManager.setCachedData(mockData);
      
      // Should succeed on retry
      expect(result).toBe(true);
      expect(callCount).toBe(2);

      // Restore original
      localStorage.setItem = originalSetItem;
    });
  });

  describe('Network failure simulation', () => {
    /**
     * Test that cache operations work independently of network
     * 
     * Cache manager should:
     * 1. Successfully read from cache regardless of network state
     * 2. Successfully write to cache regardless of network state
     * 3. Provide valid cached data when available
     */
    it('should read from cache successfully regardless of network state', () => {
      // Set up valid cache
      const mockData: cacheManager.CachedData = {
        notes: [
          {
            id: '1',
            title: 'Cached Note',
            content: 'Cached content',
            tags: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        tags: [{ id: 'tag1', name: 'Rock' }],
        noteTags: [],
        metadata: cacheManager.createCacheMetadata('2024-01-01T00:00:00Z'),
      };

      cacheManager.setCachedData(mockData);

      // Read from cache (simulating network failure scenario)
      const result = cacheManager.getCachedData();
      
      // Should successfully read cached data
      expect(result).not.toBeNull();
      expect(result?.notes).toHaveLength(1);
      expect(result?.notes[0].title).toBe('Cached Note');
    });

    it('should validate cache age correctly for fallback scenarios', () => {
      // Create cache that's 10 days old (valid)
      const validMetadata: cacheManager.CacheMetadata = {
        cachedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        lastUpdateTimestamp: '2024-01-01T00:00:00Z',
        version: '1.0',
      };

      expect(cacheManager.isCacheValid(validMetadata)).toBe(true);

      // Create cache that's 35 days old (invalid)
      const invalidMetadata: cacheManager.CacheMetadata = {
        cachedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        lastUpdateTimestamp: '2024-01-01T00:00:00Z',
        version: '1.0',
      };

      expect(cacheManager.isCacheValid(invalidMetadata)).toBe(false);
    });
  });
});
