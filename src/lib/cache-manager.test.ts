/**
 * Cache Manager Tests
 * 
 * Unit tests and property-based tests for cache manager functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  getCachedData,
  setCachedData,
  isCacheValid,
  clearCache,
  getCacheAge,
  createCacheMetadata,
  mergeNotesData,
  type CacheMetadata,
  type CachedData,
} from './cache-manager';
import type { Note, Tag } from './types';

// Mock localStorage
const localStorageMock = (() => {
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
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Cache Manager', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  // Helper function to create note arbitrary for property tests
  const createNoteArbitrary = () => fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    content: fc.string({ minLength: 0, maxLength: 1000 }),
    tags: fc.array(fc.uuid(), { maxLength: 10 }),
    artist: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    album: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    release_year: fc.option(fc.integer({ min: 1900, max: 2100 }), { nil: undefined }),
    metadata: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    is_pinned: fc.option(fc.boolean(), { nil: undefined }),
    references: fc.option(fc.webUrl(), { nil: undefined }),
    author: fc.option(fc.uuid(), { nil: undefined }),
    author_email: fc.option(fc.emailAddress(), { nil: undefined }),
    author_name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    created_at: fc.integer({ min: 946684800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
    updated_at: fc.option(fc.integer({ min: 946684800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()), { nil: undefined }),
  });

  // Helper function to create tag arbitrary for property tests
  const createTagArbitrary = () => fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
  });

  // ============================================================================
  // Property-Based Tests
  // ============================================================================

  describe('Property 1: Cache freshness validation', () => {
    /**
     * Feature: local-storage-cache, Property 1: Cache freshness validation
     * 
     * For any cached data with a timestamp, if the cache age is less than 30 days,
     * then isCacheValid should return true, otherwise it should return false.
     * 
     * Validates: Requirements 5.1, 5.2
     */
    it('should correctly validate cache freshness for any timestamp', () => {
      fc.assert(
        fc.property(
          // Generate timestamps from 0 to 60 days ago
          fc.integer({ min: 0, max: 60 }),
          (daysAgo) => {
            const now = Date.now();
            const cachedAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
            
            const metadata: CacheMetadata = {
              cachedAt: cachedAt.toISOString(),
              lastUpdateTimestamp: cachedAt.toISOString(),
              version: '1.0',
            };

            const isValid = isCacheValid(metadata);
            const expectedValid = daysAgo < 30;

            expect(isValid).toBe(expectedValid);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Cache write preserves data integrity', () => {
    /**
     * Feature: local-storage-cache, Property 5: Cache write preserves data integrity
     * 
     * For any valid notes and tags data, after writing to cache and reading back,
     * the reconstructed data should be equivalent to the original data (round-trip consistency).
     * 
     * Validates: Requirements 3.1, 3.2, 3.3, 3.5
     */
    it('should preserve data integrity through write-read round trip', () => {
      const noteArbitrary = createNoteArbitrary();
      const tagArbitrary = createTagArbitrary();

      fc.assert(
        fc.property(
          fc.array(noteArbitrary, { minLength: 1, maxLength: 20 }),
          fc.array(tagArbitrary, { minLength: 1, maxLength: 10 }),
          fc.array(
            fc.record({
              note_id: fc.uuid(),
              tag_id: fc.uuid(),
            }),
            { maxLength: 20 }
          ),
          (notes, tags, noteTags) => {
            const metadata = createCacheMetadata(new Date().toISOString());
            const originalData: CachedData = {
              notes,
              tags,
              noteTags,
              metadata,
            };

            // Write to cache
            const writeSuccess = setCachedData(originalData);
            expect(writeSuccess).toBe(true);

            // Read from cache
            const retrievedData = getCachedData();
            expect(retrievedData).not.toBeNull();

            if (retrievedData) {
              // Verify notes match
              expect(retrievedData.notes).toHaveLength(originalData.notes.length);
              expect(retrievedData.notes).toEqual(originalData.notes);

              // Verify tags match
              expect(retrievedData.tags).toHaveLength(originalData.tags.length);
              expect(retrievedData.tags).toEqual(originalData.tags);

              // Verify note-tag associations match
              expect(retrievedData.noteTags).toHaveLength(originalData.noteTags.length);
              expect(retrievedData.noteTags).toEqual(originalData.noteTags);

              // Verify metadata is preserved
              expect(retrievedData.metadata.version).toBe(originalData.metadata.version);
              expect(retrievedData.metadata.lastUpdateTimestamp).toBe(originalData.metadata.lastUpdateTimestamp);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Merge operation preserves note identity', () => {
    /**
     * Feature: local-storage-cache, Property 3: Merge operation preserves note identity
     * 
     * For any merge operation between cached notes and fetched notes, if a note with ID X
     * exists in both sets, the merged result should contain exactly one note with ID X,
     * and it should be the version from the fetched notes (newer data).
     * 
     * Validates: Requirements 2.3
     */
    it('should preserve note identity and prefer fetched version for duplicates', () => {
      const noteArbitrary = createNoteArbitrary();
      const tagArbitrary = createTagArbitrary();

      fc.assert(
        fc.property(
          fc.array(noteArbitrary, { minLength: 1, maxLength: 20 }),
          fc.array(noteArbitrary, { minLength: 1, maxLength: 20 }),
          fc.array(tagArbitrary, { minLength: 0, maxLength: 10 }),
          (cachedNotes, fetchedNotes, tags) => {
            const metadata = createCacheMetadata(new Date().toISOString());
            const cachedData: CachedData = {
              notes: cachedNotes,
              tags,
              noteTags: [],
              metadata,
            };

            const fetchedData = {
              notes: fetchedNotes,
              tags,
              noteTags: [],
            };

            const merged = mergeNotesData(cachedData, fetchedData);

            // Build a map of note IDs to count occurrences
            const noteIdCounts = new Map<string, number>();
            for (const note of merged.notes) {
              noteIdCounts.set(note.id, (noteIdCounts.get(note.id) || 0) + 1);
            }

            // Property 1: Each note ID should appear exactly once
            for (const [noteId, count] of noteIdCounts.entries()) {
              expect(count).toBe(1);
            }

            // Property 2: For overlapping IDs, the fetched version should be used
            const fetchedNoteIds = new Set(fetchedNotes.map(n => n.id));
            const cachedNoteIds = new Set(cachedNotes.map(n => n.id));
            
            for (const note of merged.notes) {
              if (fetchedNoteIds.has(note.id) && cachedNoteIds.has(note.id)) {
                // This is an overlapping ID - should be the fetched version
                const fetchedVersion = fetchedNotes.find(n => n.id === note.id);
                expect(note).toEqual(fetchedVersion);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Merge operation preserves all notes', () => {
    /**
     * Feature: local-storage-cache, Property 4: Merge operation preserves all notes
     * 
     * For any merge operation, the total number of unique note IDs in the merged result
     * should equal the number of unique note IDs across both the cached and fetched sets combined.
     * 
     * Validates: Requirements 2.4
     */
    it('should preserve all unique notes from both cached and fetched sets', () => {
      const noteArbitrary = createNoteArbitrary();
      const tagArbitrary = createTagArbitrary();

      fc.assert(
        fc.property(
          fc.array(noteArbitrary, { minLength: 0, maxLength: 20 }),
          fc.array(noteArbitrary, { minLength: 0, maxLength: 20 }),
          fc.array(tagArbitrary, { minLength: 0, maxLength: 10 }),
          (cachedNotes, fetchedNotes, tags) => {
            const metadata = createCacheMetadata(new Date().toISOString());
            const cachedData: CachedData = {
              notes: cachedNotes,
              tags,
              noteTags: [],
              metadata,
            };

            const fetchedData = {
              notes: fetchedNotes,
              tags,
              noteTags: [],
            };

            const merged = mergeNotesData(cachedData, fetchedData);

            // Calculate unique note IDs from both sets
            const allUniqueIds = new Set([
              ...cachedNotes.map(n => n.id),
              ...fetchedNotes.map(n => n.id),
            ]);

            // Calculate unique note IDs in merged result
            const mergedUniqueIds = new Set(merged.notes.map(n => n.id));

            // The number of unique IDs should match
            expect(mergedUniqueIds.size).toBe(allUniqueIds.size);

            // Every unique ID from both sets should be in the merged result
            for (const id of allUniqueIds) {
              expect(mergedUniqueIds.has(id)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // Unit Tests
  // ============================================================================

  describe('getCachedData', () => {
    it('should return null when no cache exists', () => {
      const result = getCachedData();
      expect(result).toBeNull();
    });

    it('should return cached data when valid cache exists', () => {
      const mockData: CachedData = {
        notes: [
          {
            id: '1',
            title: 'Test Note',
            content: 'Test content',
            tags: ['tag1'],
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
        tags: [{ id: 'tag1', name: 'Rock' }],
        noteTags: [{ note_id: '1', tag_id: 'tag1' }],
        metadata: {
          cachedAt: new Date().toISOString(),
          lastUpdateTimestamp: '2024-01-01T00:00:00Z',
          version: '1.0',
        },
      };

      localStorage.setItem('music-notes-cache', JSON.stringify(mockData));

      const result = getCachedData();
      expect(result).not.toBeNull();
      expect(result?.notes).toHaveLength(1);
      expect(result?.notes[0].title).toBe('Test Note');
    });

    it('should return null and clear cache when JSON is corrupted', () => {
      localStorage.setItem('music-notes-cache', 'invalid json {{{');

      const result = getCachedData();
      expect(result).toBeNull();
      expect(localStorage.getItem('music-notes-cache')).toBeNull();
    });

    it('should return null and clear cache when cache structure is invalid', () => {
      const invalidData = {
        notes: [],
        // missing tags, noteTags, and metadata
      };

      localStorage.setItem('music-notes-cache', JSON.stringify(invalidData));

      const result = getCachedData();
      expect(result).toBeNull();
      expect(localStorage.getItem('music-notes-cache')).toBeNull();
    });
  });

  describe('setCachedData', () => {
    it('should successfully write data to cache', () => {
      const mockData: CachedData = {
        notes: [
          {
            id: '1',
            title: 'Test Note',
            content: 'Test content',
            tags: ['tag1'],
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
        tags: [{ id: 'tag1', name: 'Rock' }],
        noteTags: [{ note_id: '1', tag_id: 'tag1' }],
        metadata: {
          cachedAt: new Date().toISOString(),
          lastUpdateTimestamp: '2024-01-01T00:00:00Z',
          version: '1.0',
        },
      };

      const result = setCachedData(mockData);
      expect(result).toBe(true);

      const cached = localStorage.getItem('music-notes-cache');
      expect(cached).not.toBeNull();
      
      const parsed = JSON.parse(cached!);
      expect(parsed.notes).toHaveLength(1);
    });

    it('should handle quota exceeded error by clearing cache and retrying', () => {
      const mockData: CachedData = {
        notes: [],
        tags: [],
        noteTags: [],
        metadata: {
          cachedAt: new Date().toISOString(),
          lastUpdateTimestamp: '2024-01-01T00:00:00Z',
          version: '1.0',
        },
      };

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

      const result = setCachedData(mockData);
      expect(result).toBe(true);
      expect(callCount).toBe(2);

      // Restore original
      localStorage.setItem = originalSetItem;
    });
  });

  describe('isCacheValid', () => {
    it('should return true for cache less than 30 days old', () => {
      const metadata: CacheMetadata = {
        cachedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        lastUpdateTimestamp: '2024-01-01T00:00:00Z',
        version: '1.0',
      };

      expect(isCacheValid(metadata)).toBe(true);
    });

    it('should return false for cache exactly 30 days old', () => {
      const metadata: CacheMetadata = {
        cachedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        lastUpdateTimestamp: '2024-01-01T00:00:00Z',
        version: '1.0',
      };

      expect(isCacheValid(metadata)).toBe(false);
    });

    it('should return false for cache older than 30 days', () => {
      const metadata: CacheMetadata = {
        cachedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
        lastUpdateTimestamp: '2024-01-01T00:00:00Z',
        version: '1.0',
      };

      expect(isCacheValid(metadata)).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should remove cache from localStorage', () => {
      const mockData: CachedData = {
        notes: [],
        tags: [],
        noteTags: [],
        metadata: {
          cachedAt: new Date().toISOString(),
          lastUpdateTimestamp: '2024-01-01T00:00:00Z',
          version: '1.0',
        },
      };

      localStorage.setItem('music-notes-cache', JSON.stringify(mockData));
      expect(localStorage.getItem('music-notes-cache')).not.toBeNull();

      clearCache();
      expect(localStorage.getItem('music-notes-cache')).toBeNull();
    });
  });

  describe('getCacheAge', () => {
    it('should calculate cache age correctly', () => {
      const now = Date.now();
      const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000);

      const metadata: CacheMetadata = {
        cachedAt: tenDaysAgo.toISOString(),
        lastUpdateTimestamp: '2024-01-01T00:00:00Z',
        version: '1.0',
      };

      const age = getCacheAge(metadata);
      const expectedAge = 10 * 24 * 60 * 60 * 1000;

      // Allow for small timing differences (within 1 second)
      expect(Math.abs(age - expectedAge)).toBeLessThan(1000);
    });

    it('should return 0 for cache created now', () => {
      const metadata: CacheMetadata = {
        cachedAt: new Date().toISOString(),
        lastUpdateTimestamp: '2024-01-01T00:00:00Z',
        version: '1.0',
      };

      const age = getCacheAge(metadata);
      
      // Should be very close to 0 (within 100ms)
      expect(age).toBeLessThan(100);
    });
  });

  describe('createCacheMetadata', () => {
    it('should create valid cache metadata', () => {
      const lastUpdate = '2024-01-01T00:00:00Z';
      const metadata = createCacheMetadata(lastUpdate);

      expect(metadata.lastUpdateTimestamp).toBe(lastUpdate);
      expect(metadata.version).toBe('1.0');
      expect(metadata.cachedAt).toBeDefined();
      
      // Verify cachedAt is a valid ISO timestamp
      expect(() => new Date(metadata.cachedAt)).not.toThrow();
    });
  });

  describe('mergeNotesData', () => {
    it('should merge with no overlapping IDs', () => {
      const cachedData: CachedData = {
        notes: [
          {
            id: '1',
            title: 'Cached Note 1',
            content: 'Content 1',
            tags: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        tags: [{ id: 'tag1', name: 'Rock' }],
        noteTags: [{ note_id: '1', tag_id: 'tag1' }],
        metadata: createCacheMetadata('2024-01-01T00:00:00Z'),
      };

      const fetchedData = {
        notes: [
          {
            id: '2',
            title: 'Fetched Note 2',
            content: 'Content 2',
            tags: [],
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
          },
        ],
        tags: [{ id: 'tag2', name: 'Jazz' }],
        noteTags: [{ note_id: '2', tag_id: 'tag2' }],
      };

      const merged = mergeNotesData(cachedData, fetchedData);

      expect(merged.notes).toHaveLength(2);
      expect(merged.tags).toHaveLength(2);
      expect(merged.noteTags).toHaveLength(2);
      
      const noteIds = merged.notes.map(n => n.id).sort();
      expect(noteIds).toEqual(['1', '2']);
    });

    it('should merge with all overlapping IDs', () => {
      const cachedData: CachedData = {
        notes: [
          {
            id: '1',
            title: 'Cached Note 1',
            content: 'Old Content',
            tags: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            id: '2',
            title: 'Cached Note 2',
            content: 'Old Content 2',
            tags: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        tags: [{ id: 'tag1', name: 'Rock' }],
        noteTags: [],
        metadata: createCacheMetadata('2024-01-01T00:00:00Z'),
      };

      const fetchedData = {
        notes: [
          {
            id: '1',
            title: 'Updated Note 1',
            content: 'New Content',
            tags: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-05T00:00:00Z',
          },
          {
            id: '2',
            title: 'Updated Note 2',
            content: 'New Content 2',
            tags: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-05T00:00:00Z',
          },
        ],
        tags: [{ id: 'tag1', name: 'Rock' }],
        noteTags: [],
      };

      const merged = mergeNotesData(cachedData, fetchedData);

      // Should have 2 notes (all overlapping)
      expect(merged.notes).toHaveLength(2);
      
      // Should have the fetched versions (newer data)
      const note1 = merged.notes.find(n => n.id === '1');
      expect(note1?.title).toBe('Updated Note 1');
      expect(note1?.content).toBe('New Content');
      
      const note2 = merged.notes.find(n => n.id === '2');
      expect(note2?.title).toBe('Updated Note 2');
      expect(note2?.content).toBe('New Content 2');
    });

    it('should merge with partial overlap', () => {
      const cachedData: CachedData = {
        notes: [
          {
            id: '1',
            title: 'Cached Note 1',
            content: 'Content 1',
            tags: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            id: '2',
            title: 'Cached Note 2',
            content: 'Content 2',
            tags: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        tags: [{ id: 'tag1', name: 'Rock' }],
        noteTags: [],
        metadata: createCacheMetadata('2024-01-01T00:00:00Z'),
      };

      const fetchedData = {
        notes: [
          {
            id: '2',
            title: 'Updated Note 2',
            content: 'New Content 2',
            tags: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-05T00:00:00Z',
          },
          {
            id: '3',
            title: 'New Note 3',
            content: 'Content 3',
            tags: [],
            created_at: '2024-01-05T00:00:00Z',
            updated_at: '2024-01-05T00:00:00Z',
          },
        ],
        tags: [{ id: 'tag2', name: 'Jazz' }],
        noteTags: [],
      };

      const merged = mergeNotesData(cachedData, fetchedData);

      // Should have 3 notes total (1 from cache only, 1 overlapping, 1 from fetch only)
      expect(merged.notes).toHaveLength(3);
      
      const noteIds = merged.notes.map(n => n.id).sort();
      expect(noteIds).toEqual(['1', '2', '3']);
      
      // Note 1 should be from cache (unchanged)
      const note1 = merged.notes.find(n => n.id === '1');
      expect(note1?.title).toBe('Cached Note 1');
      
      // Note 2 should be from fetch (updated)
      const note2 = merged.notes.find(n => n.id === '2');
      expect(note2?.title).toBe('Updated Note 2');
      
      // Note 3 should be from fetch (new)
      const note3 = merged.notes.find(n => n.id === '3');
      expect(note3?.title).toBe('New Note 3');
    });

    it('should handle empty cached data with fetched data', () => {
      const cachedData: CachedData = {
        notes: [],
        tags: [],
        noteTags: [],
        metadata: createCacheMetadata('2024-01-01T00:00:00Z'),
      };

      const fetchedData = {
        notes: [
          {
            id: '1',
            title: 'Fetched Note 1',
            content: 'Content 1',
            tags: [],
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
          },
        ],
        tags: [{ id: 'tag1', name: 'Rock' }],
        noteTags: [{ note_id: '1', tag_id: 'tag1' }],
      };

      const merged = mergeNotesData(cachedData, fetchedData);

      expect(merged.notes).toHaveLength(1);
      expect(merged.tags).toHaveLength(1);
      expect(merged.noteTags).toHaveLength(1);
      expect(merged.notes[0].title).toBe('Fetched Note 1');
    });

    it('should handle cached data with empty fetched data', () => {
      const cachedData: CachedData = {
        notes: [
          {
            id: '1',
            title: 'Cached Note 1',
            content: 'Content 1',
            tags: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        tags: [{ id: 'tag1', name: 'Rock' }],
        noteTags: [{ note_id: '1', tag_id: 'tag1' }],
        metadata: createCacheMetadata('2024-01-01T00:00:00Z'),
      };

      const fetchedData = {
        notes: [],
        tags: [],
        noteTags: [],
      };

      const merged = mergeNotesData(cachedData, fetchedData);

      expect(merged.notes).toHaveLength(1);
      expect(merged.tags).toHaveLength(1);
      expect(merged.noteTags).toHaveLength(1);
      expect(merged.notes[0].title).toBe('Cached Note 1');
    });
  });
});
