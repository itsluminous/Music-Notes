import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { filterNotesByParsedQuery, rankSearchResults, searchNotes } from './search-engine';
import type { Note } from './types';
import type { ParsedQuery, SearchTag } from './search-parser';

// Helper to create a note with specific fields
function createNote(overrides: Partial<Note> = {}): Note {
  return {
    id: overrides.id || 'test-id',
    title: overrides.title || 'Test Title',
    content: overrides.content || 'Test content',
    tags: overrides.tags || [],
    artist: overrides.artist,
    album: overrides.album,
    release_year: overrides.release_year,
    metadata: overrides.metadata,
    is_pinned: overrides.is_pinned || false,
    references: overrides.references,
    author: overrides.author,
    author_email: overrides.author_email,
    author_name: overrides.author_name,
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at
  };
}

describe('Property-Based Tests', () => {
  /**
   * **Feature: advanced-tag-search, Property 1: Tagged search field isolation**
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**
   * 
   * For any search tag and search term, when searching with that tag, 
   * all returned results should only match in the specified field and not in other fields.
   */
  it('Property 1: Tagged search field isolation', () => {
    const validTags: SearchTag[] = ['artist', 'album', 'title', 'content', 'metadata', 'year'];
    
    // Generate alphanumeric strings to avoid substring matching issues
    const alphanumericString = fc.stringMatching(/^[a-zA-Z0-9]{3,15}$/);
    
    fc.assert(
      fc.property(
        fc.constantFrom(...validTags),
        alphanumericString,
        (tag, term) => {
          // For year tag, only use purely numeric strings
          const isPurelyNumeric = /^\d+$/.test(term);
          
          // Skip test if year tag with non-numeric term
          if (tag === 'year' && !isPurelyNumeric) {
            return; // Skip this test case
          }
          
          const yearValue = tag === 'year' ? parseInt(term, 10) : 1999;
          const noMatchValue = 'WWWWWWWWWWWWWWW';
          
          // Create a note that matches ONLY in the specified field
          const matchingNote = createNote({
            id: 'matching',
            title: tag === 'title' ? term : noMatchValue,
            content: tag === 'content' ? term : noMatchValue,
            artist: tag === 'artist' ? term : noMatchValue,
            album: tag === 'album' ? term : noMatchValue,
            metadata: tag === 'metadata' ? term : noMatchValue,
            release_year: yearValue
          });

          // Create a note that does NOT match in the specified field
          const nonMatchingNote = createNote({
            id: 'non-matching',
            title: tag !== 'title' ? term : noMatchValue,
            content: tag !== 'content' ? term : noMatchValue,
            artist: tag !== 'artist' ? term : noMatchValue,
            album: tag !== 'album' ? term : noMatchValue,
            metadata: tag !== 'metadata' ? term : noMatchValue,
            release_year: tag !== 'year' ? (parseInt(term) || 2000) : 1999
          });

          const notes = [matchingNote, nonMatchingNote];
          const query: ParsedQuery = {
            taggedTerms: [{ tag, term }],
            untaggedTerms: []
          };

          const results = filterNotesByParsedQuery(notes, query);

          // Only the note matching in the specified field should be returned
          expect(results).toHaveLength(1);
          expect(results[0].id).toBe('matching');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-tag-search, Property 5: Multiple tag AND logic**
   * **Validates: Requirements 3.1**
   * 
   * For any combination of multiple search tags, the search results should only 
   * include notes that match ALL tagged terms (AND logic).
   */
  it('Property 5: Multiple tag AND logic', () => {
    const alphanumericString = fc.stringMatching(/^[a-zA-Z0-9]{3,15}$/);
    
    fc.assert(
      fc.property(
        alphanumericString,
        alphanumericString,
        (artistTerm, albumTerm) => {
          // Use unique base content that won't accidentally match search terms
          const uniqueBase = 'ZZZZUNIQUE';
          
          // Note that matches both tags
          const matchingBoth = createNote({
            id: 'both',
            title: uniqueBase + '1',
            content: uniqueBase + '1',
            artist: artistTerm,
            album: albumTerm
          });

          // Note that matches only artist
          const matchingArtistOnly = createNote({
            id: 'artist-only',
            title: uniqueBase + '2',
            content: uniqueBase + '2',
            artist: artistTerm,
            album: 'WWWWWWWWWWWWWWW'
          });

          // Note that matches only album
          const matchingAlbumOnly = createNote({
            id: 'album-only',
            title: uniqueBase + '3',
            content: uniqueBase + '3',
            artist: 'WWWWWWWWWWWWWWW',
            album: albumTerm
          });

          // Note that matches neither
          const matchingNeither = createNote({
            id: 'neither',
            title: uniqueBase + '4',
            content: uniqueBase + '4',
            artist: 'WWWWWWWWWWWWWWW',
            album: 'WWWWWWWWWWWWWWW'
          });

          const notes = [matchingBoth, matchingArtistOnly, matchingAlbumOnly, matchingNeither];
          const query: ParsedQuery = {
            taggedTerms: [
              { tag: 'artist', term: artistTerm },
              { tag: 'album', term: albumTerm }
            ],
            untaggedTerms: []
          };

          const results = filterNotesByParsedQuery(notes, query);

          // Only the note matching BOTH tags should be returned
          expect(results).toHaveLength(1);
          expect(results[0].id).toBe('both');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-tag-search, Property 6: Mixed query handling**
   * **Validates: Requirements 3.3**
   * 
   * For any query containing both tagged and untagged terms, untagged terms should 
   * match across all fields while tagged terms should only match their specified fields.
   */
  it('Property 6: Mixed query handling', () => {
    const alphanumericString = fc.stringMatching(/^[a-zA-Z0-9]{3,15}$/);
    
    fc.assert(
      fc.property(
        alphanumericString,
        alphanumericString,
        (artistTerm, untaggedTerm) => {
          // Skip if one term is a substring of the other to avoid accidental matches
          if (artistTerm.toLowerCase().includes(untaggedTerm.toLowerCase()) || 
              untaggedTerm.toLowerCase().includes(artistTerm.toLowerCase())) {
            return; // Skip this test case
          }
          
          // Use unique base that won't accidentally match search terms
          const uniqueBase = 'WWWWWWWWWWWWWWW';
          
          // Note that matches both artist tag and untagged term (in title)
          const matchingBoth = createNote({
            id: 'both',
            title: untaggedTerm,
            content: uniqueBase + '1',
            artist: artistTerm
          });

          // Note that matches artist but not untagged term
          const matchingArtistOnly = createNote({
            id: 'artist-only',
            title: uniqueBase + '2',
            content: uniqueBase + '3',
            artist: artistTerm
          });

          // Note that matches untagged term but not artist
          const matchingUntaggedOnly = createNote({
            id: 'untagged-only',
            title: untaggedTerm,
            content: uniqueBase + '4',
            artist: uniqueBase + '5'
          });

          const notes = [matchingBoth, matchingArtistOnly, matchingUntaggedOnly];
          const query: ParsedQuery = {
            taggedTerms: [{ tag: 'artist', term: artistTerm }],
            untaggedTerms: [untaggedTerm]
          };

          const results = filterNotesByParsedQuery(notes, query);

          // Only the note matching both should be returned
          expect(results).toHaveLength(1);
          expect(results[0].id).toBe('both');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-tag-search, Property 8: Untagged query searches all fields**
   * **Validates: Requirements 4.1**
   * 
   * For any search query without "@" tags, the search should return notes that 
   * match the query in any of the fields: title, content, metadata, artist, album, or year.
   */
  it('Property 8: Untagged query searches all fields', () => {
    const alphanumericString = fc.stringMatching(/^[a-zA-Z0-9]{3,15}$/);
    
    fc.assert(
      fc.property(
        alphanumericString,
        (term) => {
          // Use unique base that won't accidentally match search terms
          const uniqueBase = 'ZZZZUNIQUE';
          
          // Create notes matching in different fields
          const matchingInTitle = createNote({ 
            id: 'title', 
            title: term,
            content: uniqueBase + '1'
          });
          const matchingInContent = createNote({ 
            id: 'content', 
            title: uniqueBase + '2',
            content: term 
          });
          const matchingInMetadata = createNote({ 
            id: 'metadata', 
            title: uniqueBase + '3',
            content: uniqueBase + '3',
            metadata: term 
          });
          const matchingInArtist = createNote({ 
            id: 'artist', 
            title: uniqueBase + '4',
            content: uniqueBase + '4',
            artist: term 
          });
          const matchingInAlbum = createNote({ 
            id: 'album', 
            title: uniqueBase + '5',
            content: uniqueBase + '5',
            album: term 
          });
          const notMatching = createNote({ 
            id: 'none', 
            title: 'WWWWWWWWWWWWWWW',
            content: 'WWWWWWWWWWWWWWW'
          });

          const notes = [
            matchingInTitle,
            matchingInContent,
            matchingInMetadata,
            matchingInArtist,
            matchingInAlbum,
            notMatching
          ];

          const query: ParsedQuery = {
            taggedTerms: [],
            untaggedTerms: [term]
          };

          const results = filterNotesByParsedQuery(notes, query);

          // All notes except the non-matching one should be returned
          expect(results.length).toBe(5);
          expect(results.find(n => n.id === 'none')).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-tag-search, Property 9: Backward compatibility**
   * **Validates: Requirements 4.2**
   * 
   * For any untagged search query, the results should match those produced 
   * by the existing search algorithm.
   */
  it('Property 9: Backward compatibility', () => {
    // This test verifies that untagged queries work the same as the old algorithm
    // The old algorithm searches across all fields with AND logic for multiple terms
    
    const alphanumericString = fc.stringMatching(/^[a-zA-Z0-9]{3,15}$/);
    
    fc.assert(
      fc.property(
        fc.array(alphanumericString, { minLength: 1, maxLength: 3 }),
        (terms) => {
          // Create notes with various field combinations
          const allFieldsMatch = createNote({
            id: 'all',
            title: terms.join(' '),
            content: terms.join(' '),
            artist: terms[0]
          });

          const someFieldsMatch = createNote({
            id: 'some',
            title: terms[0],
            content: terms.length > 1 ? terms[1] : 'WWWWWWWWWWWWWWW'
          });

          const noFieldsMatch = createNote({
            id: 'none',
            title: 'WWWWWWWWWWWWWWW',
            content: 'WWWWWWWWWWWWWWW'
          });

          const notes = [allFieldsMatch, someFieldsMatch, noFieldsMatch];
          const query: ParsedQuery = {
            taggedTerms: [],
            untaggedTerms: terms
          };

          const results = filterNotesByParsedQuery(notes, query);

          // Notes that contain ALL terms in ANY field should match
          // This matches the old algorithm's behavior
          const allTermsNote = results.find(n => n.id === 'all');
          expect(allTermsNote).toBeDefined();

          // Note with no matches should not be in results
          const noMatchNote = results.find(n => n.id === 'none');
          expect(noMatchNote).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-tag-search, Property 10: Exact matches precede partial matches**
   * **Validates: Requirements 5.1**
   * 
   * For any search query, all notes with exact matches should appear before 
   * all notes with only partial matches in the result list.
   */
  it('Property 10: Exact matches precede partial matches', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 20 }),
        (term) => {
          // Create notes with exact and partial matches
          const exactMatchTitle = createNote({
            id: 'exact-title',
            title: term,
            created_at: '2023-01-01T00:00:00Z'
          });

          const partialMatchTitle = createNote({
            id: 'partial-title',
            title: `${term} extra words`,
            created_at: '2023-01-02T00:00:00Z'
          });

          const partialMatchContent = createNote({
            id: 'partial-content',
            title: 'Different',
            content: `some ${term} content`,
            created_at: '2023-01-03T00:00:00Z'
          });

          const notes = [partialMatchContent, partialMatchTitle, exactMatchTitle];
          const query: ParsedQuery = {
            taggedTerms: [],
            untaggedTerms: [term]
          };

          const results = rankSearchResults(notes, query);

          // Find positions of exact and partial matches
          const exactIndex = results.findIndex(n => n.id === 'exact-title');
          const partialTitleIndex = results.findIndex(n => n.id === 'partial-title');
          const partialContentIndex = results.findIndex(n => n.id === 'partial-content');

          // Exact match should come before all partial matches
          expect(exactIndex).toBeLessThan(partialTitleIndex);
          expect(exactIndex).toBeLessThan(partialContentIndex);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-tag-search, Property 11: Result ordering within match types**
   * **Validates: Requirements 5.2, 5.3**
   * 
   * For any set of notes with the same match type (exact or partial), they should be 
   * ordered by relevance score (for partial) or creation date (for exact), with higher 
   * scores and newer dates first.
   */
  it('Property 11: Result ordering within match types', () => {
    const alphanumericString = fc.stringMatching(/^[a-zA-Z0-9]{3,15}$/);
    
    fc.assert(
      fc.property(
        alphanumericString,
        (term) => {
          // Create exact matches with different dates
          const exactOlder = createNote({
            id: 'exact-older',
            title: term,
            created_at: '2023-01-01T00:00:00Z'
          });

          const exactNewer = createNote({
            id: 'exact-newer',
            title: term,
            created_at: '2023-12-31T00:00:00Z'
          });

          // Create partial matches with different scores
          const partialLowScore = createNote({
            id: 'partial-low',
            title: 'WWWWWWWWWWWWWWW',
            content: `${term}Extra`, // content = +1 point (partial match only)
            created_at: '2023-06-01T00:00:00Z'
          });

          const partialHighScore = createNote({
            id: 'partial-high',
            title: `${term}Extra`, // title = +10 points (partial match only)
            content: `${term}Extra`, // content = +1 point
            created_at: '2023-06-01T00:00:00Z'
          });

          const notes = [exactOlder, partialLowScore, exactNewer, partialHighScore];
          const query: ParsedQuery = {
            taggedTerms: [],
            untaggedTerms: [term]
          };

          const results = rankSearchResults(notes, query);

          // Within exact matches, newer should come first
          const exactOlderIndex = results.findIndex(n => n.id === 'exact-older');
          const exactNewerIndex = results.findIndex(n => n.id === 'exact-newer');
          expect(exactNewerIndex).toBeLessThan(exactOlderIndex);

          // Within partial matches, higher score should come first
          const partialLowIndex = results.findIndex(n => n.id === 'partial-low');
          const partialHighIndex = results.findIndex(n => n.id === 'partial-high');
          expect(partialHighIndex).toBeLessThan(partialLowIndex);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-tag-search, Property 12: Title field scoring priority**
   * **Validates: Requirements 5.4**
   * 
   * For any partial match search, notes with matches in the title field should 
   * receive higher relevance scores than notes with matches only in other fields.
   */
  it('Property 12: Title field scoring priority', () => {
    const alphanumericString = fc.stringMatching(/^[a-zA-Z0-9]{3,15}$/);
    
    fc.assert(
      fc.property(
        alphanumericString,
        (term) => {
          // Note with match in title (partial match only, no exact)
          const titleMatch = createNote({
            id: 'title',
            title: `${term}Extra`, // No space to ensure partial match only
            created_at: '2023-01-01T00:00:00Z'
          });

          // Note with match only in content
          const contentMatch = createNote({
            id: 'content',
            title: 'WWWWWWWWWWWWWWW',
            content: `${term}Extra`, // Also partial to be fair
            created_at: '2023-01-01T00:00:00Z'
          });

          // Note with match only in metadata
          const metadataMatch = createNote({
            id: 'metadata',
            title: 'WWWWWWWWWWWWWWW',
            metadata: `${term}Extra`, // Also partial to be fair
            created_at: '2023-01-01T00:00:00Z'
          });

          const notes = [contentMatch, metadataMatch, titleMatch];
          const query: ParsedQuery = {
            taggedTerms: [],
            untaggedTerms: [term]
          };

          const results = rankSearchResults(notes, query);

          // Title match should come first (highest score: +10 vs +1 or +2)
          expect(results[0].id).toBe('title');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-tag-search, Property 13: Case-insensitive matching**
   * **Validates: Requirements 6.1, 6.3**
   * 
   * For any search term and field value, matching should succeed regardless of 
   * case differences between the term and value.
   */
  it('Property 13: Case-insensitive matching', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.toLowerCase() !== s.toUpperCase()),
        (term) => {
          // Create notes with different case variations
          const lowercase = createNote({
            id: 'lower',
            title: term.toLowerCase()
          });

          const uppercase = createNote({
            id: 'upper',
            title: term.toUpperCase()
          });

          const mixedcase = createNote({
            id: 'mixed',
            title: term
          });

          const notes = [lowercase, uppercase, mixedcase];

          // Search with lowercase term
          const queryLower: ParsedQuery = {
            taggedTerms: [],
            untaggedTerms: [term.toLowerCase()]
          };

          const resultsLower = filterNotesByParsedQuery(notes, queryLower);

          // Search with uppercase term
          const queryUpper: ParsedQuery = {
            taggedTerms: [],
            untaggedTerms: [term.toUpperCase()]
          };

          const resultsUpper = filterNotesByParsedQuery(notes, queryUpper);

          // Both searches should return all notes
          expect(resultsLower).toHaveLength(3);
          expect(resultsUpper).toHaveLength(3);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-tag-search, Property 14: Comma-separated artist handling**
   * **Validates: Requirements 7.1**
   * 
   * For any artist field containing comma-separated values, searching for any 
   * individual artist name should match that note.
   */
  it('Property 14: Comma-separated artist handling', () => {
    const alphanumericString = fc.stringMatching(/^[a-zA-Z0-9]{3,15}$/);
    
    fc.assert(
      fc.property(
        alphanumericString,
        alphanumericString,
        (artist1, artist2) => {
          // Note with comma-separated artists
          const multiArtist = createNote({
            id: 'multi',
            artist: `${artist1}, ${artist2}`
          });

          const notes = [multiArtist];

          // Search for first artist
          const query1: ParsedQuery = {
            taggedTerms: [{ tag: 'artist', term: artist1 }],
            untaggedTerms: []
          };

          const results1 = filterNotesByParsedQuery(notes, query1);
          expect(results1).toHaveLength(1);

          // Search for second artist
          const query2: ParsedQuery = {
            taggedTerms: [{ tag: 'artist', term: artist2 }],
            untaggedTerms: []
          };

          const results2 = filterNotesByParsedQuery(notes, query2);
          expect(results2).toHaveLength(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-tag-search, Property 15: Artist whitespace trimming**
   * **Validates: Requirements 7.3**
   * 
   * For any comma-separated artist field, whitespace around artist names should 
   * be trimmed before matching.
   */
  it('Property 15: Artist whitespace trimming', () => {
    const alphanumericString = fc.stringMatching(/^[a-zA-Z0-9]{3,15}$/);
    
    fc.assert(
      fc.property(
        alphanumericString,
        alphanumericString,
        (artist1, artist2) => {
          // Note with comma-separated artists with extra whitespace
          const multiArtist = createNote({
            id: 'multi',
            artist: `  ${artist1}  ,   ${artist2}  `
          });

          const notes = [multiArtist];

          // Search for artists without extra whitespace
          const query1: ParsedQuery = {
            taggedTerms: [{ tag: 'artist', term: artist1 }],
            untaggedTerms: []
          };

          const results1 = filterNotesByParsedQuery(notes, query1);
          expect(results1).toHaveLength(1);

          const query2: ParsedQuery = {
            taggedTerms: [{ tag: 'artist', term: artist2 }],
            untaggedTerms: []
          };

          const results2 = filterNotesByParsedQuery(notes, query2);
          expect(results2).toHaveLength(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-tag-search, Property 16: Year exact numeric matching**
   * **Validates: Requirements 8.2**
   * 
   * For any year search, only notes with release_year exactly equal to the 
   * searched year should be returned.
   */
  it('Property 16: Year exact numeric matching', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1900, max: 2100 }),
        (year) => {
          // Notes with different years
          const exactYear = createNote({
            id: 'exact',
            release_year: year
          });

          const differentYear = createNote({
            id: 'different',
            release_year: year + 1
          });

          const noYear = createNote({
            id: 'no-year'
          });

          const notes = [exactYear, differentYear, noYear];
          const query: ParsedQuery = {
            taggedTerms: [{ tag: 'year', term: String(year) }],
            untaggedTerms: []
          };

          const results = filterNotesByParsedQuery(notes, query);

          // Only the exact year match should be returned
          expect(results).toHaveLength(1);
          expect(results[0].id).toBe('exact');
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Unit Tests - Specific Search Examples', () => {
  it('searches "@artist Arijit @album Blah" correctly', () => {
    const matching = createNote({
      id: 'match',
      artist: 'Arijit Singh',
      album: 'Blah'
    });

    const onlyArtist = createNote({
      id: 'artist',
      artist: 'Arijit Singh',
      album: 'Different'
    });

    const onlyAlbum = createNote({
      id: 'album',
      artist: 'Different',
      album: 'yoyo'
    });

    const notes = [matching, onlyArtist, onlyAlbum];
    const query: ParsedQuery = {
      taggedTerms: [
        { tag: 'artist', term: 'Arijit' },
        { tag: 'album', term: 'Blah' }
      ],
      untaggedTerms: []
    };

    const results = searchNotes(notes, query);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('match');
  });

  it('handles "@artist arijit" with case variations', () => {
    const lowercase = createNote({ id: 'lower', artist: 'arijit' });
    const uppercase = createNote({ id: 'upper', artist: 'ARIJIT' });
    const mixedcase = createNote({ id: 'mixed', artist: 'Arijit' });

    const notes = [lowercase, uppercase, mixedcase];
    const query: ParsedQuery = {
      taggedTerms: [{ tag: 'artist', term: 'arijit' }],
      untaggedTerms: []
    };

    const results = searchNotes(notes, query);

    expect(results).toHaveLength(3);
  });

  it('handles "@artist Shreya" with comma-separated artists', () => {
    const multiArtist = createNote({
      id: 'multi',
      artist: 'Arijit Singh, Shreya Ghoshal'
    });

    const singleArtist = createNote({
      id: 'single',
      artist: 'Arijit Singh'
    });

    const notes = [multiArtist, singleArtist];
    const query: ParsedQuery = {
      taggedTerms: [{ tag: 'artist', term: 'Shreya' }],
      untaggedTerms: []
    };

    const results = searchNotes(notes, query);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('multi');
  });

  it('handles "@year 1999" with exact match', () => {
    const year1999 = createNote({ id: '1999', release_year: 1999 });
    const year2000 = createNote({ id: '2000', release_year: 2000 });
    const year1998 = createNote({ id: '1998', release_year: 1998 });

    const notes = [year1999, year2000, year1998];
    const query: ParsedQuery = {
      taggedTerms: [{ tag: 'year', term: '1999' }],
      untaggedTerms: []
    };

    const results = searchNotes(notes, query);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1999');
  });
});
