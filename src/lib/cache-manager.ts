/**
 * Cache Manager Module
 * 
 * Handles all localStorage operations for caching notes, tags, and metadata.
 * Implements cache validation, read/write operations, and error handling.
 */

import type { Note, Tag } from './types';
import * as debugLogger from './debug-logger';

const CACHE_KEY = 'music-notes-cache';
const CACHE_VERSION = '1.0';
// Read TTL from environment variable (in days), default to 30 days
const TTL_DAYS = parseInt(process.env.NEXT_PUBLIC_CACHE_TTL_DAYS || '30', 10);
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Metadata stored with cached data
 */
export interface CacheMetadata {
  cachedAt: string; // ISO timestamp when cache was created
  lastUpdateTimestamp: string; // Most recent updated_at from notes
  version: string; // Cache schema version for future migrations
}

/**
 * Structure of data stored in cache
 */
export interface CachedData {
  notes: Note[];
  tags: Tag[];
  noteTags: Array<{ note_id: string; tag_id: string }>;
  metadata: CacheMetadata;
}

/**
 * Get cached data from localStorage
 * @returns Cached data or null if cache is invalid/missing
 */
export function getCachedData(): CachedData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    
    if (!cached) {
      debugLogger.logCacheMiss('No cached data found');
      return null;
    }

    const data = JSON.parse(cached) as CachedData;
    
    // Validate cache structure
    if (!data.metadata || !data.notes || !data.tags || !data.noteTags) {
      debugLogger.logCacheMiss('Invalid cache structure');
      clearCache();
      return null;
    }

    const age = getCacheAge(data.metadata);
    debugLogger.logCacheHit(data.notes.length, age);
    
    return data;
  } catch (error) {
    debugLogger.logError('Cache Read', error as Error);
    clearCache();
    return null;
  }
}

/**
 * Write data to localStorage cache
 * @param data - Data to cache
 * @returns true if write succeeded, false otherwise
 */
export function setCachedData(data: CachedData): boolean {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(CACHE_KEY, serialized);
    return true;
  } catch (error) {
    debugLogger.logError('Cache Write', error as Error);
    
    // If localStorage is full, try clearing cache and writing again
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      try {
        clearCache();
        const serialized = JSON.stringify(data);
        localStorage.setItem(CACHE_KEY, serialized);
        return true;
      } catch (retryError) {
        debugLogger.logError('Cache Write Retry', retryError as Error);
        return false;
      }
    }
    
    return false;
  }
}

/**
 * Check if cached data is still valid (within TTL)
 * @param metadata - Cache metadata to validate
 * @returns true if cache is valid, false if expired
 */
export function isCacheValid(metadata: CacheMetadata): boolean {
  const age = getCacheAge(metadata);
  const isValid = age < TTL_MS;
  
  if (!isValid) {
    debugLogger.logCacheInvalidation(`Cache expired (age: ${(age / (1000 * 60 * 60 * 24)).toFixed(1)} days)`);
  }
  
  return isValid;
}

/**
 * Clear cache from localStorage
 */
export function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    debugLogger.logError('Cache Clear', error as Error);
  }
}

/**
 * Get age of cache in milliseconds
 * @param metadata - Cache metadata
 * @returns Age in milliseconds
 */
export function getCacheAge(metadata: CacheMetadata): number {
  const cachedAt = new Date(metadata.cachedAt).getTime();
  const now = Date.now();
  return now - cachedAt;
}

/**
 * Create cache metadata for new cache entry
 * @param lastUpdateTimestamp - Most recent updated_at from notes
 * @returns Cache metadata object
 */
export function createCacheMetadata(lastUpdateTimestamp: string): CacheMetadata {
  return {
    cachedAt: new Date().toISOString(),
    lastUpdateTimestamp,
    version: CACHE_VERSION,
  };
}

/**
 * Merge cached data with freshly fetched data
 * Replaces existing notes/tags with fetched versions (newer data)
 * Appends new notes/tags that don't exist in cache
 * 
 * @param cachedData - Data from cache
 * @param fetchedData - Freshly fetched data from database
 * @returns Merged dataset with updated metadata
 */
export function mergeNotesData(
  cachedData: CachedData,
  fetchedData: Omit<CachedData, 'metadata'>
): CachedData {
  // Use Maps for O(1) lookup by ID
  const notesMap = new Map<string, Note>();
  const tagsMap = new Map<string, Tag>();
  const noteTagsSet = new Set<string>();

  // Add cached notes to map
  for (const note of cachedData.notes) {
    notesMap.set(note.id, note);
  }

  // Add cached tags to map
  for (const tag of cachedData.tags) {
    tagsMap.set(tag.id, tag);
  }

  // Add cached note-tag associations to set
  for (const noteTag of cachedData.noteTags) {
    noteTagsSet.add(`${noteTag.note_id}:${noteTag.tag_id}`);
  }

  let updatedCount = 0;
  let addedCount = 0;

  // Merge fetched notes (replace existing, add new)
  for (const note of fetchedData.notes) {
    if (notesMap.has(note.id)) {
      updatedCount++;
    } else {
      addedCount++;
    }
    notesMap.set(note.id, note);
  }

  // Merge fetched tags (replace existing, add new)
  for (const tag of fetchedData.tags) {
    tagsMap.set(tag.id, tag);
  }

  // Merge fetched note-tag associations
  for (const noteTag of fetchedData.noteTags) {
    noteTagsSet.add(`${noteTag.note_id}:${noteTag.tag_id}`);
  }

  // Convert maps and sets back to arrays
  const mergedNotes = Array.from(notesMap.values());
  const mergedTags = Array.from(tagsMap.values());
  const mergedNoteTags = Array.from(noteTagsSet).map(key => {
    const [note_id, tag_id] = key.split(':');
    return { note_id, tag_id };
  });

  // Find the most recent updated_at timestamp from merged notes
  const lastUpdateTimestamp = mergedNotes.reduce((latest, note) => {
    if (!note.updated_at) return latest;
    return note.updated_at > latest ? note.updated_at : latest;
  }, cachedData.metadata.lastUpdateTimestamp);

  // Log merge operation
  debugLogger.logMergeOperation(updatedCount, addedCount);

  return {
    notes: mergedNotes,
    tags: mergedTags,
    noteTags: mergedNoteTags,
    metadata: createCacheMetadata(lastUpdateTimestamp),
  };
}

/**
 * Cache statistics for display and debugging
 */
export interface CacheStatistics {
  exists: boolean;
  isValid: boolean;
  age: number; // in milliseconds
  ageFormatted: string; // human-readable format
  size: number; // in bytes
  sizeFormatted: string; // human-readable format
  noteCount: number;
  tagCount: number;
  cachedAt: string | null;
  lastUpdateTimestamp: string | null;
}

/**
 * Get cache statistics for display and debugging
 * @returns Cache statistics object
 */
export function getCacheStatistics(): CacheStatistics {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    
    if (!cached) {
      return {
        exists: false,
        isValid: false,
        age: 0,
        ageFormatted: 'N/A',
        size: 0,
        sizeFormatted: '0 B',
        noteCount: 0,
        tagCount: 0,
        cachedAt: null,
        lastUpdateTimestamp: null,
      };
    }

    const data = JSON.parse(cached) as CachedData;
    const age = getCacheAge(data.metadata);
    const isValid = isCacheValid(data.metadata);
    const size = new Blob([cached]).size;

    return {
      exists: true,
      isValid,
      age,
      ageFormatted: formatAge(age),
      size,
      sizeFormatted: formatSize(size),
      noteCount: data.notes.length,
      tagCount: data.tags.length,
      cachedAt: data.metadata.cachedAt,
      lastUpdateTimestamp: data.metadata.lastUpdateTimestamp,
    };
  } catch (error) {
    debugLogger.logError('Get Cache Statistics', error as Error);
    return {
      exists: false,
      isValid: false,
      age: 0,
      ageFormatted: 'Error',
      size: 0,
      sizeFormatted: 'Error',
      noteCount: 0,
      tagCount: 0,
      cachedAt: null,
      lastUpdateTimestamp: null,
    };
  }
}

/**
 * Format age in milliseconds to human-readable string
 * @param ageMs - Age in milliseconds
 * @returns Formatted age string
 */
function formatAge(ageMs: number): string {
  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else {
    return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Format size in bytes to human-readable string
 * @param bytes - Size in bytes
 * @returns Formatted size string
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
