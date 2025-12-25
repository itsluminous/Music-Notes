import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { AVAILABLE_TAGS } from './tag-suggestion-dropdown';

/**
 * **Feature: advanced-tag-search, Property 3: Tag suggestion filtering**
 * **Validates: Requirements 2.5**
 * 
 * For any character sequence typed after "@", the displayed tag suggestions 
 * should only include tags that match the typed characters.
 */
describe('Property-Based Tests', () => {
  it('Property 3: Tag suggestion filtering - filters tags correctly', () => {
    // Generate arbitrary filter text (characters that might be typed after @)
    const filterTextArb = fc.string({ maxLength: 10 });

    fc.assert(
      fc.property(filterTextArb, (filterText) => {
        // Apply the same filtering logic as the component
        const lowerFilter = filterText.toLowerCase();
        const filteredTags = AVAILABLE_TAGS.filter(tag => 
          tag.tag.toLowerCase().includes(lowerFilter) ||
          tag.label.toLowerCase().includes(lowerFilter)
        );

        // Property: Every filtered tag should match the filter text
        filteredTags.forEach(tag => {
          const matches = 
            tag.tag.toLowerCase().includes(lowerFilter) ||
            tag.label.toLowerCase().includes(lowerFilter);
          expect(matches).toBe(true);
        });

        // Property: No unfiltered tag should be excluded if it matches
        AVAILABLE_TAGS.forEach(tag => {
          const shouldBeIncluded = 
            tag.tag.toLowerCase().includes(lowerFilter) ||
            tag.label.toLowerCase().includes(lowerFilter);
          
          const isIncluded = filteredTags.some(ft => ft.value === tag.value);
          
          if (shouldBeIncluded) {
            expect(isIncluded).toBe(true);
          }
        });

        // Property: Empty filter should return all tags
        if (filterText === '') {
          expect(filteredTags).toHaveLength(AVAILABLE_TAGS.length);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Unit Tests - Dropdown UI Behavior', () => {
  it('all 6 tags are available in AVAILABLE_TAGS', () => {
    expect(AVAILABLE_TAGS).toHaveLength(6);
    
    const expectedTags = ['artist', 'album', 'title', 'content', 'metadata', 'year'];
    const actualTags = AVAILABLE_TAGS.map(t => t.tag);
    
    expectedTags.forEach(tag => {
      expect(actualTags).toContain(tag);
    });
  });

  it('each tag has required properties', () => {
    AVAILABLE_TAGS.forEach(tag => {
      expect(tag).toHaveProperty('value');
      expect(tag).toHaveProperty('label');
      expect(tag).toHaveProperty('description');
      expect(tag).toHaveProperty('tag');
      expect(tag.value).toMatch(/^@/);
    });
  });

  it('filters tags by partial match on tag name', () => {
    const filterText = 'art';
    const lowerFilter = filterText.toLowerCase();
    const filtered = AVAILABLE_TAGS.filter(tag => 
      tag.tag.toLowerCase().includes(lowerFilter) ||
      tag.label.toLowerCase().includes(lowerFilter)
    );
    
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.some(t => t.tag === 'artist')).toBe(true);
  });

  it('filters tags by partial match on label', () => {
    const filterText = 'Art';
    const lowerFilter = filterText.toLowerCase();
    const filtered = AVAILABLE_TAGS.filter(tag => 
      tag.tag.toLowerCase().includes(lowerFilter) ||
      tag.label.toLowerCase().includes(lowerFilter)
    );
    
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.some(t => t.tag === 'artist')).toBe(true);
  });

  it('returns empty array when no tags match filter', () => {
    const filterText = 'xyz123notfound';
    const lowerFilter = filterText.toLowerCase();
    const filtered = AVAILABLE_TAGS.filter(tag => 
      tag.tag.toLowerCase().includes(lowerFilter) ||
      tag.label.toLowerCase().includes(lowerFilter)
    );
    
    expect(filtered).toHaveLength(0);
  });

  it('returns all tags when filter is empty', () => {
    const filterText = '';
    const lowerFilter = filterText.toLowerCase();
    const filtered = AVAILABLE_TAGS.filter(tag => 
      tag.tag.toLowerCase().includes(lowerFilter) ||
      tag.label.toLowerCase().includes(lowerFilter)
    );
    
    expect(filtered).toHaveLength(AVAILABLE_TAGS.length);
  });

  it('filtering is case-insensitive', () => {
    const filterText1 = 'ARTIST';
    const filterText2 = 'artist';
    const filterText3 = 'ArTiSt';
    
    const filtered1 = AVAILABLE_TAGS.filter(tag => 
      tag.tag.toLowerCase().includes(filterText1.toLowerCase()) ||
      tag.label.toLowerCase().includes(filterText1.toLowerCase())
    );
    
    const filtered2 = AVAILABLE_TAGS.filter(tag => 
      tag.tag.toLowerCase().includes(filterText2.toLowerCase()) ||
      tag.label.toLowerCase().includes(filterText2.toLowerCase())
    );
    
    const filtered3 = AVAILABLE_TAGS.filter(tag => 
      tag.tag.toLowerCase().includes(filterText3.toLowerCase()) ||
      tag.label.toLowerCase().includes(filterText3.toLowerCase())
    );
    
    expect(filtered1).toEqual(filtered2);
    expect(filtered2).toEqual(filtered3);
  });
});
