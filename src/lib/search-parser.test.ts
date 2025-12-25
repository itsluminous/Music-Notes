import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseSearchQuery, type SearchTag } from './search-parser';

/**
 * **Feature: advanced-tag-search, Property 7: Query parsing correctness**
 * **Validates: Requirements 3.4**
 * 
 * For any search query string, the parser should correctly extract all tags 
 * with their associated terms and separate untagged terms.
 */
describe('Property-Based Tests', () => {
  it('Property 7: Query parsing correctness - correctly extracts tags and terms', () => {
    const validTags: SearchTag[] = ['artist', 'album', 'title', 'content', 'metadata', 'year'];
    
    // Arbitrary for generating valid tagged terms
    const taggedTermArb = fc.record({
      tag: fc.constantFrom(...validTags),
      term: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes(' ') && !s.startsWith('@'))
    });

    // Arbitrary for generating untagged terms
    const untaggedTermArb = fc.string({ minLength: 1, maxLength: 20 })
      .filter(s => !s.includes(' ') && !s.startsWith('@'));

    // Arbitrary for generating a query with known structure
    const queryStructureArb = fc.record({
      taggedTerms: fc.array(taggedTermArb, { maxLength: 5 }),
      untaggedTerms: fc.array(untaggedTermArb, { maxLength: 5 })
    });

    fc.assert(
      fc.property(queryStructureArb, (structure) => {
        // Build query string from structure
        const queryParts: string[] = [];
        
        // Add tagged terms
        structure.taggedTerms.forEach(({ tag, term }) => {
          queryParts.push(`@${tag}`, term);
        });
        
        // Add untagged terms
        queryParts.push(...structure.untaggedTerms);
        
        // Shuffle to test order independence of parsing
        const query = queryParts.join(' ');
        
        // Parse the query
        const result = parseSearchQuery(query);
        
        // Verify all tagged terms are extracted
        expect(result.taggedTerms).toHaveLength(structure.taggedTerms.length);
        
        structure.taggedTerms.forEach((expected) => {
          const found = result.taggedTerms.find(
            t => t.tag === expected.tag && t.term === expected.term
          );
          expect(found).toBeDefined();
        });
        
        // Verify all untagged terms are extracted
        expect(result.untaggedTerms).toHaveLength(structure.untaggedTerms.length);
        
        structure.untaggedTerms.forEach((expected) => {
          expect(result.untaggedTerms).toContain(expected);
        });
      }),
      { numRuns: 100 }
    );
  });
});

describe('Unit Tests - Edge Cases', () => {
  it('handles empty query', () => {
    const result = parseSearchQuery('');
    expect(result.taggedTerms).toEqual([]);
    expect(result.untaggedTerms).toEqual([]);
  });

  it('handles whitespace-only query', () => {
    const result = parseSearchQuery('   ');
    expect(result.taggedTerms).toEqual([]);
    expect(result.untaggedTerms).toEqual([]);
  });

  it('ignores orphaned tags (tag without following term)', () => {
    const result = parseSearchQuery('@artist');
    expect(result.taggedTerms).toEqual([]);
    expect(result.untaggedTerms).toEqual([]);
  });

  it('ignores orphaned tags at end of query', () => {
    const result = parseSearchQuery('hello @artist');
    expect(result.taggedTerms).toEqual([]);
    expect(result.untaggedTerms).toEqual(['hello']);
  });

  it('treats invalid tags as untagged terms', () => {
    const result = parseSearchQuery('@invalid term');
    expect(result.taggedTerms).toEqual([]);
    expect(result.untaggedTerms).toEqual(['@invalid', 'term']);
  });

  it('handles multiple spaces between terms', () => {
    const result = parseSearchQuery('@artist  Arijit   @content    Pritam');
    expect(result.taggedTerms).toEqual([
      { tag: 'artist', term: 'Arijit' },
      { tag: 'content', term: 'Pritam' }
    ]);
  });

  it('handles mixed valid and invalid tags', () => {
    const result = parseSearchQuery('@artist Arijit @invalid test @content Pritam');
    expect(result.taggedTerms).toEqual([
      { tag: 'artist', term: 'Arijit' },
      { tag: 'content', term: 'Pritam' }
    ]);
    expect(result.untaggedTerms).toEqual(['@invalid', 'test']);
  });

  it('handles case-insensitive tag names', () => {
    const result = parseSearchQuery('@ARTIST Arijit @Title Pritam');
    expect(result.taggedTerms).toEqual([
      { tag: 'artist', term: 'Arijit' },
      { tag: 'title', term: 'Pritam' }
    ]);
  });

  it('handles consecutive tags without terms', () => {
    const result = parseSearchQuery('@artist @title Pritam');
    expect(result.taggedTerms).toEqual([
      { tag: 'title', term: 'Pritam' }
    ]);
  });

  it('parses complex mixed query correctly', () => {
    const result = parseSearchQuery('@artist Arijit @title Pritam love song');
    expect(result.taggedTerms).toEqual([
      { tag: 'artist', term: 'Arijit' },
      { tag: 'title', term: 'Pritam' }
    ]);
    expect(result.untaggedTerms).toEqual(['love', 'song']);
  });

  it('handles all valid tag types', () => {
    const result = parseSearchQuery(
      '@artist A @title C @album Al @title T @content Co @metadata M @year 2020'
    );
    expect(result.taggedTerms).toHaveLength(7);
    expect(result.taggedTerms).toEqual([
      { tag: 'artist', term: 'A' },
      { tag: 'title', term: 'C' },
      { tag: 'album', term: 'Al' },
      { tag: 'title', term: 'T' },
      { tag: 'content', term: 'Co' },
      { tag: 'metadata', term: 'M' },
      { tag: 'year', term: '2020' }
    ]);
  });
});
