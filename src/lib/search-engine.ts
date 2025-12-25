import type { Note } from './types';
import type { ParsedQuery, SearchTag } from './search-parser';

interface SearchResult {
  note: Note;
  score: number;
  matchType: 'exact' | 'partial';
}

/**
 * Filters notes based on a parsed search query.
 * Applies AND logic for both tagged and untagged terms.
 * 
 * @param notes - Array of notes to filter
 * @param parsedQuery - Parsed query with tagged and untagged terms
 * @returns Filtered array of notes
 */
export function filterNotesByParsedQuery(notes: Note[], parsedQuery: ParsedQuery): Note[] {
  const { taggedTerms, untaggedTerms } = parsedQuery;

  return notes.filter(note => {
    // Check all tagged terms (AND logic)
    const matchesAllTaggedTerms = taggedTerms.every(({ tag, term }) => {
      return matchesField(note, tag, term);
    });

    if (!matchesAllTaggedTerms) {
      return false;
    }

    // Check all untagged terms (AND logic) - search across all fields
    const matchesAllUntaggedTerms = untaggedTerms.every(term => {
      return matchesAnyField(note, term);
    });

    return matchesAllUntaggedTerms;
  });
}

/**
 * Checks if a note's specific field matches the search term.
 * Handles special cases like comma-separated artists and exact year matching.
 * 
 * @param note - Note to check
 * @param tag - Field to search in
 * @param term - Search term
 * @returns True if the field matches the term
 */
function matchesField(note: Note, tag: SearchTag, term: string): boolean {
  // Filter out whitespace-only terms
  if (!term || term.trim() === '') return false;
  
  const termLower = term.toLowerCase();

  switch (tag) {
    case 'artist':
      if (!note.artist) return false;
      // Split by comma and check each artist
      const artists = note.artist.split(',').map(a => a.trim().toLowerCase());
      return artists.some(artist => artist.includes(termLower));

    case 'album':
      if (!note.album) return false;
      return note.album.toLowerCase().includes(termLower);

    case 'title':
      return note.title.toLowerCase().includes(termLower);

    case 'content':
      return note.content.toLowerCase().includes(termLower);

    case 'metadata':
      if (!note.metadata) return false;
      return note.metadata.toLowerCase().includes(termLower);

    case 'year':
      if (!note.release_year) return false;
      // Exact numeric match for year
      return String(note.release_year) === term;

    default:
      return false;
  }
}

/**
 * Checks if a note matches the search term in any field.
 * Used for untagged search terms.
 * 
 * @param note - Note to check
 * @param term - Search term
 * @returns True if any field matches the term
 */
function matchesAnyField(note: Note, term: string): boolean {
  // Filter out whitespace-only terms
  if (!term || term.trim() === '') return false;
  
  const termLower = term.toLowerCase();

  // Check title
  if (note.title.toLowerCase().includes(termLower)) return true;

  // Check content
  if (note.content.toLowerCase().includes(termLower)) return true;

  // Check metadata
  if (note.metadata && note.metadata.toLowerCase().includes(termLower)) return true;

  // Check artist (with comma-separated handling)
  if (note.artist) {
    const artists = note.artist.split(',').map(a => a.trim().toLowerCase());
    if (artists.some(artist => artist.includes(termLower))) return true;
  }

  // Check album
  if (note.album && note.album.toLowerCase().includes(termLower)) return true;

  // Check year
  if (note.release_year && String(note.release_year).includes(term)) return true;

  return false;
}

/**
 * Ranks search results by exact matches first, then partial matches by score.
 * 
 * @param notes - Filtered notes to rank
 * @param parsedQuery - Parsed query used for ranking
 * @returns Sorted array of notes
 */
export function rankSearchResults(notes: Note[], parsedQuery: ParsedQuery): Note[] {
  const { taggedTerms, untaggedTerms } = parsedQuery;

  // Calculate search results with scores and match types
  const results: SearchResult[] = notes.map(note => {
    let score = 0;
    let hasExactMatch = false;

    // Check for exact matches in tagged terms
    taggedTerms.forEach(({ tag, term }) => {
      if (isExactMatch(note, tag, term)) {
        hasExactMatch = true;
      }
    });

    // Check for exact matches in untagged terms
    untaggedTerms.forEach(term => {
      if (hasExactMatchInAnyField(note, term)) {
        hasExactMatch = true;
      }
    });

    // Calculate relevance score for partial matches
    const allTerms = [
      ...taggedTerms.map(t => t.term),
      ...untaggedTerms
    ];

    allTerms.forEach(term => {
      const termLower = term.toLowerCase();

      // Title matches: +10 points
      if (note.title.toLowerCase().includes(termLower)) {
        score += 10;
      }

      // Content matches: +1 point
      if (note.content.toLowerCase().includes(termLower)) {
        score += 1;
      }

      // Metadata matches: +2 points
      if (note.metadata && note.metadata.toLowerCase().includes(termLower)) {
        score += 2;
      }

      // Artist matches: +1 point
      if (note.artist) {
        const artists = note.artist.split(',').map(a => a.trim().toLowerCase());
        if (artists.some(artist => artist.includes(termLower))) {
          score += 1;
        }
      }

      // Album matches: +1 point
      if (note.album && note.album.toLowerCase().includes(termLower)) {
        score += 1;
      }
    });

    return {
      note,
      score,
      matchType: hasExactMatch ? 'exact' : 'partial'
    };
  });

  // Sort: exact matches first, then by score/date
  return results.sort((a, b) => {
    // Exact matches before partial matches
    if (a.matchType === 'exact' && b.matchType === 'partial') return -1;
    if (a.matchType === 'partial' && b.matchType === 'exact') return 1;

    // Within exact matches, sort by creation date (newest first)
    if (a.matchType === 'exact' && b.matchType === 'exact') {
      return new Date(b.note.created_at).getTime() - new Date(a.note.created_at).getTime();
    }

    // Within partial matches, sort by score (highest first)
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    // If scores are equal, sort by creation date (newest first)
    return new Date(b.note.created_at).getTime() - new Date(a.note.created_at).getTime();
  }).map(result => result.note);
}

/**
 * Checks if a note has an exact match in a specific field.
 * 
 * @param note - Note to check
 * @param tag - Field to check
 * @param term - Search term
 * @returns True if there's an exact match
 */
function isExactMatch(note: Note, tag: SearchTag, term: string): boolean {
  const termLower = term.toLowerCase();

  switch (tag) {
    case 'artist':
      if (!note.artist) return false;
      const artists = note.artist.split(',').map(a => a.trim().toLowerCase());
      return artists.some(artist => artist === termLower);

    case 'album':
      return note.album?.toLowerCase() === termLower;

    case 'title':
      return note.title.toLowerCase() === termLower;

    case 'content':
      return note.content.toLowerCase() === termLower;

    case 'metadata':
      return note.metadata?.toLowerCase() === termLower;

    case 'year':
      return note.release_year !== undefined && String(note.release_year) === term;

    default:
      return false;
  }
}

/**
 * Checks if a note has an exact match in any field.
 * 
 * @param note - Note to check
 * @param term - Search term
 * @returns True if there's an exact match in any field
 */
function hasExactMatchInAnyField(note: Note, term: string): boolean {
  const termLower = term.toLowerCase();

  // Check title
  if (note.title.toLowerCase() === termLower) return true;

  // Check content
  if (note.content.toLowerCase() === termLower) return true;

  // Check metadata
  if (note.metadata && note.metadata.toLowerCase() === termLower) return true;

  // Check artist
  if (note.artist) {
    const artists = note.artist.split(',').map(a => a.trim().toLowerCase());
    if (artists.some(artist => artist === termLower)) return true;
  }

  // Check album
  if (note.album && note.album.toLowerCase() === termLower) return true;

  // Check year
  if (note.release_year && String(note.release_year) === term) return true;

  return false;
}

/**
 * Main search function that combines filtering and ranking.
 * 
 * @param notes - Array of notes to search
 * @param parsedQuery - Parsed search query
 * @returns Filtered and ranked array of notes
 */
export function searchNotes(notes: Note[], parsedQuery: ParsedQuery): Note[] {
  const filtered = filterNotesByParsedQuery(notes, parsedQuery);
  return rankSearchResults(filtered, parsedQuery);
}
