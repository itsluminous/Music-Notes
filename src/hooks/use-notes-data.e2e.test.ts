/**
 * End-to-End Cache Flow Tests
 * 
 * Tests the complete cache flow including:
 * - First load (no cache) → full fetch → cache write → UI display
 * - Second load (valid cache) → instant load → incremental fetch → merge → UI update
 * - Third load (expired cache) → full fetch → cache write → UI display
 * - Cache invalidation after 30 days
 * - Incremental updates work correctly
 * - UI shows cached data immediately on subsequent loads
 * - Large datasets (1000+ notes)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as cacheManager from '@/lib/cache-manager';
import type { Note, Tag } from '@/lib/types';

// Note: These are integration tests that test the cache manager directly
// rather than the full React hook to avoid complex mocking issues

// Mock localStorage
const createMockLocalStorage = () => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

// Helper to create mock notes
const createMockNotes = (count: number, startId: number = 1, baseTimestamp: string = '2024-01-01T00:00:00Z'): any[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `note-${startId + i}`,
    title: `Note ${startId + i}`,
    content: `Content for note ${startId + i}`,
    artist: `Artist ${startId + i}`,
    album: null,
    metadata: null,
    references: null,
    is_pinned: false,
    author: 'user-1',
    author_email: 'user@example.com',
    author_name: 'Test User',
    user_id: 'user-1',
    created_at: baseTimestamp,
    updated_at: new Date(new Date(baseTimestamp).getTime() + i * 1000).toISOString(),
  }));
};

// Helper to create mock tags
const createMockTags = (count: number): Tag[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `tag-${i + 1}`,
    name: `Tag ${i + 1}`,
  }));
};

// Helper to create mock note-tags
const createMockNoteTags = (noteIds: string[], tagIds: string[]): any[] => {
  const noteTags: any[] = [];
  noteIds.forEach((noteId, i) => {
    const tagId = tagIds[i % tagIds.length];
    noteTags.push({ note_id: noteId, tag_id: tagId });
  });
  return noteTags;
};

describe('End-to-End Cache Flow Tests', () => {
  let mockLocalStorage: ReturnType<typeof createMockLocalStorage>;

  beforeEach(() => {
    // Setup mock localStorage
    mockLocalStorage = createMockLocalStorage();
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  describe('First Load: No Cache → Full Fetch → Cache Write', () => {
    /**
     * Test first load scenario
     * 
     * When user opens app for the first time:
     * 1. No cache exists
     * 2. Full fetch is performed (simulated)
     * 3. Data is cached
     * 4. Cache is valid
     */
    it('should cache data on first load', () => {
      const mockNotes = createMockNotes(10);
      const mockTags = createMockTags(5);
      const mockNoteTags = createMockNoteTags(
        mockNotes.map(n => n.id),
        mockTags.map(t => t.id)
      );

      // Verify no cache exists
      expect(cacheManager.getCachedData()).toBeNull();

      // Simulate caching after full fetch
      const lastUpdateTimestamp = mockNotes[mockNotes.length - 1].updated_at;
      const cacheData: cacheManager.CachedData = {
        notes: mockNotes,
        tags: mockTags,
        noteTags: mockNoteTags,
        metadata: cacheManager.createCacheMetadata(lastUpdateTimestamp),
      };

      const writeSuccess = cacheManager.setCachedData(cacheData);
      expect(writeSuccess).toBe(true);

      // Verify cache was written
      const cachedData = cacheManager.getCachedData();
      expect(cachedData).not.toBeNull();
      expect(cachedData?.notes.length).toBe(10);
      expect(cachedData?.tags.length).toBe(5);
      expect(cacheManager.isCacheValid(cachedData!.metadata)).toBe(true);
    });
  });

  describe('Second Load: Valid Cache → Instant Load → Incremental Fetch → Merge', () => {
    /**
     * Test second load scenario with valid cache
     * 
     * When user opens app with valid cache:
     * 1. Cache is loaded instantly
     * 2. Incremental data is fetched (simulated)
     * 3. New data is merged with cached data
     * 4. Cache is updated
     */
    it('should load from cache and merge incremental updates', () => {
      // Setup initial cache
      const cachedNotes = createMockNotes(10, 1, '2024-01-01T00:00:00Z');
      const cachedTags = createMockTags(5);
      const cachedNoteTags = createMockNoteTags(
        cachedNotes.map(n => n.id),
        cachedTags.map(t => t.id)
      );

      const lastUpdateTimestamp = cachedNotes[cachedNotes.length - 1].updated_at;

      const cacheData: cacheManager.CachedData = {
        notes: cachedNotes,
        tags: cachedTags,
        noteTags: cachedNoteTags,
        metadata: cacheManager.createCacheMetadata(lastUpdateTimestamp),
      };

      cacheManager.setCachedData(cacheData);

      // Verify cache is loaded
      const loadedCache = cacheManager.getCachedData();
      expect(loadedCache).not.toBeNull();
      expect(loadedCache?.notes.length).toBe(10);

      // Simulate incremental fetch (3 new notes)
      const newNotes = createMockNotes(3, 11, '2024-01-02T00:00:00Z');
      const newNoteTags = createMockNoteTags(
        newNotes.map(n => n.id),
        cachedTags.map(t => t.id)
      );

      // Merge with cached data
      const mergedData = cacheManager.mergeNotesData(cacheData, {
        notes: newNotes,
        tags: cachedTags,
        noteTags: newNoteTags,
      });

      // Verify merged data (10 original + 3 new = 13 total)
      expect(mergedData.notes.length).toBe(13);

      // Update cache with merged data
      cacheManager.setCachedData(mergedData);

      // Verify cache was updated
      const updatedCache = cacheManager.getCachedData();
      expect(updatedCache?.notes.length).toBe(13);
    });

    it('should replace existing notes with updated versions during merge', () => {
      // Setup initial cache with 5 notes
      const cachedNotes = createMockNotes(5, 1, '2024-01-01T00:00:00Z');
      const cachedTags = createMockTags(3);
      const cachedNoteTags = createMockNoteTags(
        cachedNotes.map(n => n.id),
        cachedTags.map(t => t.id)
      );

      const cacheData: cacheManager.CachedData = {
        notes: cachedNotes,
        tags: cachedTags,
        noteTags: cachedNoteTags,
        metadata: cacheManager.createCacheMetadata(cachedNotes[4].updated_at),
      };

      // Simulate incremental fetch with 2 updated notes and 1 new note
      const updatedNote1 = {
        ...cachedNotes[0],
        title: 'Updated Note 1',
        content: 'Updated content',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const updatedNote3 = {
        ...cachedNotes[2],
        title: 'Updated Note 3',
        content: 'Updated content',
        updated_at: '2024-01-02T00:00:01Z',
      };

      const newNote = createMockNotes(1, 6, '2024-01-02T00:00:02Z')[0];

      const incrementalNotes = [updatedNote1, updatedNote3, newNote];
      const incrementalNoteTags = createMockNoteTags(
        incrementalNotes.map(n => n.id),
        cachedTags.map(t => t.id)
      );

      // Merge data
      const mergedData = cacheManager.mergeNotesData(cacheData, {
        notes: incrementalNotes,
        tags: cachedTags,
        noteTags: incrementalNoteTags,
      });

      // Verify total count (5 original + 1 new = 6, with 2 updated)
      expect(mergedData.notes.length).toBe(6);

      // Verify updated notes have new content
      const note1 = mergedData.notes.find(n => n.id === 'note-1');
      expect(note1?.title).toBe('Updated Note 1');
      expect(note1?.content).toBe('Updated content');

      const note3 = mergedData.notes.find(n => n.id === 'note-3');
      expect(note3?.title).toBe('Updated Note 3');

      // Verify new note exists
      const note6 = mergedData.notes.find(n => n.id === 'note-6');
      expect(note6).toBeDefined();
    });
  });

  describe('Third Load: Expired Cache → Full Fetch → Cache Write', () => {
    /**
     * Test expired cache scenario
     * 
     * When user opens app with expired cache (> 30 days):
     * 1. Cache is detected as invalid
     * 2. Cache is cleared
     * 3. Full fetch is performed (simulated)
     * 4. New cache is written
     */
    it('should invalidate expired cache and perform full fetch', () => {
      // Setup expired cache (35 days old)
      const expiredNotes = createMockNotes(10);
      const expiredTags = createMockTags(5);
      const expiredNoteTags = createMockNoteTags(
        expiredNotes.map(n => n.id),
        expiredTags.map(t => t.id)
      );

      const expiredMetadata: cacheManager.CacheMetadata = {
        cachedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        lastUpdateTimestamp: '2023-11-01T00:00:00Z',
        version: '1.0',
      };

      const expiredCache: cacheManager.CachedData = {
        notes: expiredNotes,
        tags: expiredTags,
        noteTags: expiredNoteTags,
        metadata: expiredMetadata,
      };

      cacheManager.setCachedData(expiredCache);

      // Verify cache exists but is invalid
      expect(cacheManager.getCachedData()).not.toBeNull();
      expect(cacheManager.isCacheValid(expiredMetadata)).toBe(false);

      // Clear expired cache
      cacheManager.clearCache();

      // Verify cache is cleared
      expect(cacheManager.getCachedData()).toBeNull();

      // Simulate fresh data fetch
      const freshNotes = createMockNotes(15, 1, '2024-01-15T00:00:00Z');
      const freshTags = createMockTags(7);
      const freshNoteTags = createMockNoteTags(
        freshNotes.map(n => n.id),
        freshTags.map(t => t.id)
      );

      const freshCacheData: cacheManager.CachedData = {
        notes: freshNotes,
        tags: freshTags,
        noteTags: freshNoteTags,
        metadata: cacheManager.createCacheMetadata(freshNotes[freshNotes.length - 1].updated_at),
      };

      cacheManager.setCachedData(freshCacheData);

      // Verify new cache was written
      const newCache = cacheManager.getCachedData();
      expect(newCache).not.toBeNull();
      expect(newCache?.notes.length).toBe(15);
      expect(cacheManager.isCacheValid(newCache!.metadata)).toBe(true);
    });
  });

  describe('Cache Invalidation After 30 Days', () => {
    /**
     * Test cache TTL boundary conditions
     */
    it('should invalidate cache at exactly 30 days', () => {
      // Cache at exactly 30 days
      const metadata30Days: cacheManager.CacheMetadata = {
        cachedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastUpdateTimestamp: '2023-11-25T00:00:00Z',
        version: '1.0',
      };

      // Should be invalid at exactly 30 days (TTL is < 30 days, not <=)
      expect(cacheManager.isCacheValid(metadata30Days)).toBe(false);
    });

    it('should invalidate cache at 30 days + 1 second', () => {
      // Cache at 30 days + 1 second
      const metadataExpired: cacheManager.CacheMetadata = {
        cachedAt: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000 + 1000)).toISOString(),
        lastUpdateTimestamp: '2023-11-25T00:00:00Z',
        version: '1.0',
      };

      expect(cacheManager.isCacheValid(metadataExpired)).toBe(false);
    });

    it('should validate cache at 29 days', () => {
      // Cache at 29 days
      const metadata29Days: cacheManager.CacheMetadata = {
        cachedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
        lastUpdateTimestamp: '2023-11-26T00:00:00Z',
        version: '1.0',
      };

      expect(cacheManager.isCacheValid(metadata29Days)).toBe(true);
    });
  });

  describe('Large Dataset Performance (1000+ notes)', () => {
    /**
     * Test cache performance with large datasets
     */
    it('should handle 1000+ notes efficiently', () => {
      // Create large dataset
      const largeNoteSet = createMockNotes(1200);
      const largeTags = createMockTags(50);
      const largeNoteTags = createMockNoteTags(
        largeNoteSet.map(n => n.id),
        largeTags.map(t => t.id)
      );

      const cacheData: cacheManager.CachedData = {
        notes: largeNoteSet,
        tags: largeTags,
        noteTags: largeNoteTags,
        metadata: cacheManager.createCacheMetadata(largeNoteSet[largeNoteSet.length - 1].updated_at),
      };

      // Measure cache write time
      const writeStart = Date.now();
      const writeSuccess = cacheManager.setCachedData(cacheData);
      const writeTime = Date.now() - writeStart;

      expect(writeSuccess).toBe(true);
      console.log(`Cache write time for 1200 notes: ${writeTime}ms`);

      // Measure cache read time
      const readStart = Date.now();
      const readData = cacheManager.getCachedData();
      const readTime = Date.now() - readStart;

      expect(readData).not.toBeNull();
      expect(readData?.notes.length).toBe(1200);
      console.log(`Cache read time for 1200 notes: ${readTime}ms`);

      // Read time should be < 100ms for good UX
      expect(readTime).toBeLessThan(100);
    });

    it('should merge large datasets efficiently', () => {
      // Create large cached dataset
      const cachedNotes = createMockNotes(1000, 1, '2024-01-01T00:00:00Z');
      const cachedTags = createMockTags(50);
      const cachedNoteTags = createMockNoteTags(
        cachedNotes.map(n => n.id),
        cachedTags.map(t => t.id)
      );

      const cachedData: cacheManager.CachedData = {
        notes: cachedNotes,
        tags: cachedTags,
        noteTags: cachedNoteTags,
        metadata: cacheManager.createCacheMetadata(cachedNotes[cachedNotes.length - 1].updated_at),
      };

      // Create incremental update with 200 new notes
      const newNotes = createMockNotes(200, 1001, '2024-01-02T00:00:00Z');
      const newNoteTags = createMockNoteTags(
        newNotes.map(n => n.id),
        cachedTags.map(t => t.id)
      );

      // Measure merge time
      const mergeStart = Date.now();
      const mergedData = cacheManager.mergeNotesData(cachedData, {
        notes: newNotes,
        tags: cachedTags,
        noteTags: newNoteTags,
      });
      const mergeTime = Date.now() - mergeStart;

      expect(mergedData.notes.length).toBe(1200);
      console.log(`Merge time for 1000 + 200 notes: ${mergeTime}ms`);

      // Merge should be fast (< 50ms)
      expect(mergeTime).toBeLessThan(50);
    });
  });
});
