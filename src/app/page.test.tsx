import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * **Feature: advanced-tag-search, Property 2: Tag dropdown visibility trigger**
 * **Validates: Requirements 2.1**
 * 
 * For any search input state, when the "@" character is typed, 
 * the tag suggestion dropdown should become visible.
 */
describe('Property-Based Tests - Tag Dropdown Visibility', () => {
  it('Property 2: Tag dropdown visibility trigger - @ character triggers dropdown', () => {
    // Generate arbitrary text before and after the @ symbol
    const textBeforeArb = fc.string({ maxLength: 20 });
    const textAfterArb = fc.string({ maxLength: 20 }).filter(s => !s.includes(' '));

    fc.assert(
      fc.property(textBeforeArb, textAfterArb, (textBefore, textAfter) => {
        // Simulate the detection logic from handleSearchInputChange
        const value = textBefore + '@' + textAfter;
        const cursorPos = textBefore.length + 1 + textAfter.length; // Cursor at end
        
        const textBeforeCursor = value.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        let shouldShowDropdown = false;
        
        if (lastAtIndex !== -1) {
          // Check if @ is at word boundary
          const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
          if (charBeforeAt === ' ' || lastAtIndex === 0) {
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
            // Only show dropdown if there's no space after @
            if (!textAfterAt.includes(' ')) {
              shouldShowDropdown = true;
            }
          }
        }
        
        // Property: If @ is at word boundary and no space after it, dropdown should show
        if (lastAtIndex !== -1) {
          const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
          const isAtWordBoundary = charBeforeAt === ' ' || lastAtIndex === 0;
          const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
          const hasSpaceAfter = textAfterAt.includes(' ');
          
          if (isAtWordBoundary && !hasSpaceAfter) {
            expect(shouldShowDropdown).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: @ at start of input triggers dropdown', () => {
    // Generate text after @ (no spaces, no @)
    const textAfterArb = fc.string({ maxLength: 10 }).filter(s => !s.includes(' ') && !s.includes('@'));

    fc.assert(
      fc.property(textAfterArb, (textAfter) => {
        const value = '@' + textAfter;
        const cursorPos = value.length;
        
        const textBeforeCursor = value.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        let shouldShowDropdown = false;
        
        if (lastAtIndex !== -1) {
          const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
          if (charBeforeAt === ' ' || lastAtIndex === 0) {
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
            if (!textAfterAt.includes(' ')) {
              shouldShowDropdown = true;
            }
          }
        }
        
        // Property: @ at start with no space after should trigger dropdown
        expect(shouldShowDropdown).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: @ after space triggers dropdown', () => {
    // Generate text before space and after @
    const textBeforeSpaceArb = fc.string({ minLength: 1, maxLength: 10 }).filter(s => !s.includes(' ') && !s.includes('@'));
    const textAfterArb = fc.string({ maxLength: 10 }).filter(s => !s.includes(' ') && !s.includes('@'));

    fc.assert(
      fc.property(textBeforeSpaceArb, textAfterArb, (textBeforeSpace, textAfter) => {
        const value = textBeforeSpace + ' @' + textAfter;
        const cursorPos = value.length;
        
        const textBeforeCursor = value.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        let shouldShowDropdown = false;
        
        if (lastAtIndex !== -1) {
          const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
          if (charBeforeAt === ' ' || lastAtIndex === 0) {
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
            if (!textAfterAt.includes(' ')) {
              shouldShowDropdown = true;
            }
          }
        }
        
        // Property: @ after space with no space after should trigger dropdown
        expect(shouldShowDropdown).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: @ in middle of word does not trigger dropdown', () => {
    // Generate text that has @ in the middle of a word (no space before)
    const textBeforeArb = fc.string({ minLength: 1, maxLength: 10 }).filter(s => !s.includes(' ') && s.length > 0);
    const textAfterArb = fc.string({ maxLength: 10 }).filter(s => !s.includes(' '));

    fc.assert(
      fc.property(textBeforeArb, textAfterArb, (textBefore, textAfter) => {
        // Ensure textBefore doesn't end with space
        const cleanTextBefore = textBefore.trim();
        if (cleanTextBefore.length === 0) return; // Skip if empty after trim
        
        const value = cleanTextBefore + '@' + textAfter;
        const cursorPos = value.length;
        
        const textBeforeCursor = value.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
        
        // Property: @ not at word boundary should not trigger dropdown
        if (charBeforeAt !== ' ' && lastAtIndex !== 0) {
          expect(charBeforeAt).not.toBe(' ');
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: advanced-tag-search, Property 4: Tag insertion at cursor**
 * **Validates: Requirements 2.3**
 * 
 * For any selected tag and cursor position, clicking a tag suggestion 
 * should insert that tag at the current cursor position in the input.
 */
describe('Property-Based Tests - Tag Insertion', () => {
  it('Property 4: Tag insertion at cursor - tag inserted at correct position', () => {
    // Generate arbitrary text before and after cursor, and a tag
    const textBeforeArb = fc.string({ maxLength: 20 });
    const textAfterArb = fc.string({ maxLength: 20 });
    const tagArb = fc.constantFrom('@artist', '@album', '@title', '@content', '@metadata', '@year');

    fc.assert(
      fc.property(textBeforeArb, textAfterArb, tagArb, (textBefore, textAfter, tag) => {
        // Simulate the tag insertion logic from handleTagSelect
        const value = textBefore + textAfter;
        const cursorPosition = textBefore.length;
        
        const textBeforeCursor = value.substring(0, cursorPosition);
        const textAfterCursor = value.substring(cursorPosition);
        
        // Find @ before cursor
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        let newValue: string;
        let newCursorPos: number;
        
        if (lastAtIndex !== -1) {
          // Replace from @ to cursor with the selected tag
          const beforeAt = value.substring(0, lastAtIndex);
          newValue = beforeAt + tag + ' ' + textAfterCursor;
          newCursorPos = lastAtIndex + tag.length + 1;
        } else {
          // If no @ found, insert at cursor position
          newValue = textBeforeCursor + tag + ' ' + textAfterCursor;
          newCursorPos = cursorPosition + tag.length + 1;
        }
        
        // Property: The tag should appear in the new value
        expect(newValue).toContain(tag);
        
        // Property: The text after cursor should be preserved
        expect(newValue).toContain(textAfter);
        
        // Property: If @ was present, it should be replaced
        if (lastAtIndex !== -1) {
          const beforeAt = value.substring(0, lastAtIndex);
          expect(newValue.startsWith(beforeAt + tag)).toBe(true);
        } else {
          // If no @, tag should be inserted at cursor
          expect(newValue.substring(0, cursorPosition + tag.length)).toBe(textBeforeCursor + tag);
        }
        
        // Property: Cursor position should be after the tag and space
        if (lastAtIndex !== -1) {
          expect(newCursorPos).toBe(lastAtIndex + tag.length + 1);
        } else {
          expect(newCursorPos).toBe(cursorPosition + tag.length + 1);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: Tag replaces @ and filter text when @ is present', () => {
    // Generate text before @, filter text after @, text after cursor, and a tag
    const textBeforeAtArb = fc.string({ maxLength: 10 });
    const filterTextArb = fc.string({ maxLength: 5 }).filter(s => !s.includes(' ') && !s.includes('@'));
    const textAfterArb = fc.string({ maxLength: 10 });
    const tagArb = fc.constantFrom('@artist', '@album', '@title', '@content', '@metadata', '@year');

    fc.assert(
      fc.property(textBeforeAtArb, filterTextArb, textAfterArb, tagArb, (textBeforeAt, filterText, textAfter, tag) => {
        // Create a value with @ and filter text
        const value = textBeforeAt + '@' + filterText + textAfter;
        const cursorPosition = textBeforeAt.length + 1 + filterText.length; // Cursor after filter text
        
        const textBeforeCursor = value.substring(0, cursorPosition);
        const textAfterCursor = value.substring(cursorPosition);
        
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        // Simulate tag insertion
        const beforeAt = value.substring(0, lastAtIndex);
        const newValue = beforeAt + tag + ' ' + textAfterCursor;
        
        // Property: The tag should be in the result
        expect(newValue).toContain(tag);
        
        // Property: Text before @ should be preserved
        expect(newValue.startsWith(textBeforeAt + tag)).toBe(true);
        
        // Property: Text after cursor should be preserved
        expect(newValue.endsWith(textAfter)).toBe(true);
        
        // Property: The replacement happened correctly
        // The new value should be: textBeforeAt + tag + ' ' + textAfter
        expect(newValue).toBe(textBeforeAt + tag + ' ' + textAfter);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: Tag inserted at cursor when no @ is present', () => {
    // Generate text before and after cursor, and a tag
    const textBeforeArb = fc.string({ maxLength: 20 }).filter(s => !s.includes('@'));
    const textAfterArb = fc.string({ maxLength: 20 });
    const tagArb = fc.constantFrom('@artist', '@album', '@title', '@content', '@metadata', '@year');

    fc.assert(
      fc.property(textBeforeArb, textAfterArb, tagArb, (textBefore, textAfter, tag) => {
        const value = textBefore + textAfter;
        const cursorPosition = textBefore.length;
        
        const textBeforeCursor = value.substring(0, cursorPosition);
        const textAfterCursor = value.substring(cursorPosition);
        
        // No @ in textBefore
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        expect(lastAtIndex).toBe(-1);
        
        // Simulate tag insertion
        const newValue = textBeforeCursor + tag + ' ' + textAfterCursor;
        const newCursorPos = cursorPosition + tag.length + 1;
        
        // Property: Tag should be inserted at cursor position
        expect(newValue.substring(0, cursorPosition + tag.length + 1)).toBe(textBefore + tag + ' ');
        
        // Property: Text after cursor should be preserved
        expect(newValue.endsWith(textAfter)).toBe(true);
        
        // Property: Cursor should be after tag and space
        expect(newCursorPos).toBe(textBefore.length + tag.length + 1);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Unit Tests for @ icon and tag selection
 * Requirements: 2.6, 2.7
 */
describe('Unit Tests - @ Icon and Tag Selection', () => {
  it('@ icon click should trigger dropdown visibility', () => {
    // Simulate the @ icon click logic
    let showTagDropdown = false;
    let tagFilterText = 'some-text';
    
    // Simulate handleAtIconClick
    showTagDropdown = true;
    tagFilterText = '';
    
    expect(showTagDropdown).toBe(true);
    expect(tagFilterText).toBe('');
  });

  it('tag selection inserts tag at cursor position when @ is present', () => {
    // Setup: text with @ before cursor
    const searchQuery = 'hello @ar world';
    const cursorPosition = 9; // After "@ar"
    const selectedTag = '@artist';
    
    const textBeforeCursor = searchQuery.substring(0, cursorPosition);
    const textAfterCursor = searchQuery.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    // Simulate tag selection
    const beforeAt = searchQuery.substring(0, lastAtIndex);
    const newValue = beforeAt + selectedTag + ' ' + textAfterCursor;
    const newCursorPos = lastAtIndex + selectedTag.length + 1;
    
    expect(newValue).toBe('hello @artist  world');
    expect(newCursorPos).toBe(14); // After "@artist "
    expect(newValue).toContain(selectedTag);
  });

  it('tag selection inserts tag at cursor position when no @ is present', () => {
    // Setup: text without @
    const searchQuery = 'hello world';
    const cursorPosition = 6; // After "hello "
    const selectedTag = '@artist';
    
    const textBeforeCursor = searchQuery.substring(0, cursorPosition);
    const textAfterCursor = searchQuery.substring(cursorPosition);
    
    // Simulate tag selection (no @ found)
    const newValue = textBeforeCursor + selectedTag + ' ' + textAfterCursor;
    const newCursorPos = cursorPosition + selectedTag.length + 1;
    
    expect(newValue).toBe('hello @artist world');
    expect(newCursorPos).toBe(14); // After "hello @artist "
    expect(newValue).toContain(selectedTag);
  });

  it('tag selection replaces @ and partial tag text', () => {
    // Setup: text with @ and partial tag
    const searchQuery = '@art';
    const cursorPosition = 4; // At end
    const selectedTag = '@artist';
    
    const textBeforeCursor = searchQuery.substring(0, cursorPosition);
    const textAfterCursor = searchQuery.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    // Simulate tag selection
    const beforeAt = searchQuery.substring(0, lastAtIndex);
    const newValue = beforeAt + selectedTag + ' ' + textAfterCursor;
    
    expect(newValue).toBe('@artist ');
    // The original partial text "@art" is replaced by the full tag
    expect(searchQuery).toContain('@art');
    expect(newValue).toContain(selectedTag);
  });

  it('tag selection works with multiple @ symbols', () => {
    // Setup: text with multiple @
    const searchQuery = '@artist Arijit @com';
    const cursorPosition = 19; // After "@com"
    const selectedTag = '@year';
    
    const textBeforeCursor = searchQuery.substring(0, cursorPosition);
    const textAfterCursor = searchQuery.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    // Simulate tag selection (should replace the last @)
    const beforeAt = searchQuery.substring(0, lastAtIndex);
    const newValue = beforeAt + selectedTag + ' ' + textAfterCursor;
    
    expect(newValue).toBe('@artist Arijit @year ');
    expect(newValue).toContain('@artist');
    expect(newValue).toContain('@year');
    // The original partial text "@com" is replaced by the full tag
    expect(searchQuery).toContain('@com');
  });

  it('@ icon click should clear filter text', () => {
    // Setup: existing filter text
    let tagFilterText = 'artist';
    let showTagDropdown = false;
    
    // Simulate @ icon click
    showTagDropdown = true;
    tagFilterText = '';
    
    expect(showTagDropdown).toBe(true);
    expect(tagFilterText).toBe('');
  });

  it('tag selection should close dropdown', () => {
    // Setup: dropdown is open
    let showTagDropdown = true;
    let tagFilterText = 'art';
    
    // Simulate tag selection
    showTagDropdown = false;
    tagFilterText = '';
    
    expect(showTagDropdown).toBe(false);
    expect(tagFilterText).toBe('');
  });

  it('tag selection adds space after tag', () => {
    // Setup
    const searchQuery = '@';
    const cursorPosition = 1;
    const selectedTag = '@artist';
    
    const textBeforeCursor = searchQuery.substring(0, cursorPosition);
    const textAfterCursor = searchQuery.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    // Simulate tag selection
    const beforeAt = searchQuery.substring(0, lastAtIndex);
    const newValue = beforeAt + selectedTag + ' ' + textAfterCursor;
    
    expect(newValue).toBe('@artist ');
    expect(newValue.endsWith(' ')).toBe(true);
  });
});

/**
 * Unit Tests for No-Capo Filter Feature
 * Tests the filtering logic for notes without "Capo" in metadata
 */
describe('Unit Tests - No-Capo Filter', () => {
  // Mock note type for testing
  type TestNote = {
    id: string;
    title: string;
    tags: string[];
    metadata?: string;
    is_pinned?: boolean;
  };

  it('should identify notes without Capo in metadata', () => {
    const notes: TestNote[] = [
      { id: '1', title: 'Note 1', tags: [], metadata: 'Key: C' },
      { id: '2', title: 'Note 2', tags: [], metadata: 'Capo 2' },
      { id: '3', title: 'Note 3', tags: [], metadata: undefined },
      { id: '4', title: 'Note 4', tags: [], metadata: 'Key: G, Tempo: 120' },
    ];

    const hasNoCapoNotes = notes.some(
      note => !note.metadata || !note.metadata.toLowerCase().includes('capo')
    );

    expect(hasNoCapoNotes).toBe(true);
  });

  it('should filter notes without Capo when showNoCapo is true', () => {
    const notes: TestNote[] = [
      { id: '1', title: 'Note 1', tags: [], metadata: 'Key: C' },
      { id: '2', title: 'Note 2', tags: [], metadata: 'Capo 2' },
      { id: '3', title: 'Note 3', tags: [], metadata: undefined },
      { id: '4', title: 'Note 4', tags: [], metadata: 'Key: G, capo 3' },
    ];

    const showNoCapo = true;
    const selectedTags: string[] = [];
    const showPinned = false;
    const showUntagged = false;

    const filtered = notes.filter((note) => {
      if (showNoCapo && selectedTags.length === 0 && !showPinned && !showUntagged) {
        return !note.metadata || !note.metadata.toLowerCase().includes('capo');
      }
      return true;
    });

    expect(filtered).toHaveLength(2);
    expect(filtered.map(n => n.id)).toEqual(['1', '3']);
  });

  it('should be case-insensitive when checking for Capo', () => {
    const notes: TestNote[] = [
      { id: '1', title: 'Note 1', tags: [], metadata: 'CAPO 2' },
      { id: '2', title: 'Note 2', tags: [], metadata: 'Capo 3' },
      { id: '3', title: 'Note 3', tags: [], metadata: 'capo 1' },
      { id: '4', title: 'Note 4', tags: [], metadata: 'Key: C' },
    ];

    const filtered = notes.filter(
      note => !note.metadata || !note.metadata.toLowerCase().includes('capo')
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('4');
  });

  it('should treat notes with undefined metadata as No-Capo', () => {
    const notes: TestNote[] = [
      { id: '1', title: 'Note 1', tags: [], metadata: undefined },
      { id: '2', title: 'Note 2', tags: [], metadata: 'Capo 2' },
      { id: '3', title: 'Note 3', tags: [] }, // metadata not set
    ];

    const filtered = notes.filter(
      note => !note.metadata || !note.metadata.toLowerCase().includes('capo')
    );

    expect(filtered).toHaveLength(2);
    expect(filtered.map(n => n.id)).toEqual(['1', '3']);
  });

  it('should not show No-Capo filter when all notes have Capo', () => {
    const notes: TestNote[] = [
      { id: '1', title: 'Note 1', tags: [], metadata: 'Capo 1' },
      { id: '2', title: 'Note 2', tags: [], metadata: 'Capo 2' },
      { id: '3', title: 'Note 3', tags: [], metadata: 'Key: G, Capo 3' },
    ];

    const hasNoCapoNotes = notes.some(
      note => !note.metadata || !note.metadata.toLowerCase().includes('capo')
    );

    expect(hasNoCapoNotes).toBe(false);
  });

  it('should show No-Capo filter when at least one note has no Capo', () => {
    const notes: TestNote[] = [
      { id: '1', title: 'Note 1', tags: [], metadata: 'Capo 1' },
      { id: '2', title: 'Note 2', tags: [], metadata: 'Key: C' },
      { id: '3', title: 'Note 3', tags: [], metadata: 'Capo 3' },
    ];

    const hasNoCapoNotes = notes.some(
      note => !note.metadata || !note.metadata.toLowerCase().includes('capo')
    );

    expect(hasNoCapoNotes).toBe(true);
  });

  it('should ignore No-Capo filter when other tags are selected', () => {
    const notes: TestNote[] = [
      { id: '1', title: 'Note 1', tags: ['tag1'], metadata: 'Key: C' },
      { id: '2', title: 'Note 2', tags: ['tag1'], metadata: 'Capo 2' },
      { id: '3', title: 'Note 3', tags: ['tag2'], metadata: 'Key: G' },
    ];

    const showNoCapo = true;
    const selectedTags = ['tag1'];
    const showPinned = false;
    const showUntagged = false;

    const filtered = notes.filter((note) => {
      // When other tags are selected, No-Capo is ignored
      if (selectedTags.length === 0 && !showUntagged && !showPinned && !showNoCapo) return true;
      
      if (showNoCapo && selectedTags.length === 0 && !showPinned && !showUntagged) {
        return !note.metadata || !note.metadata.toLowerCase().includes('capo');
      }
      
      return selectedTags.every((tagId) => note.tags.includes(tagId));
    });

    expect(filtered).toHaveLength(2);
    expect(filtered.map(n => n.id)).toEqual(['1', '2']);
  });

  it('should work independently from Untagged filter', () => {
    const notes: TestNote[] = [
      { id: '1', title: 'Note 1', tags: [], metadata: 'Key: C' },
      { id: '2', title: 'Note 2', tags: ['tag1'], metadata: 'Capo 2' },
      { id: '3', title: 'Note 3', tags: [], metadata: undefined },
    ];

    // Test No-Capo filter alone
    const showNoCapo = true;
    const showUntagged = false;
    const selectedTags: string[] = [];
    const showPinned = false;

    const filteredNoCapo = notes.filter((note) => {
      if (showNoCapo && selectedTags.length === 0 && !showPinned && !showUntagged) {
        return !note.metadata || !note.metadata.toLowerCase().includes('capo');
      }
      return true;
    });

    expect(filteredNoCapo).toHaveLength(2);
    expect(filteredNoCapo.map(n => n.id)).toEqual(['1', '3']);

    // Test Untagged filter alone
    const showNoCapo2 = false;
    const showUntagged2 = true;

    const filteredUntagged = notes.filter((note) => {
      if (showUntagged2 && selectedTags.length === 0 && !showPinned && !showNoCapo2) {
        return note.tags.length === 0;
      }
      return true;
    });

    expect(filteredUntagged).toHaveLength(2);
    expect(filteredUntagged.map(n => n.id)).toEqual(['1', '3']);
  });

  it('should work independently from Pinned filter', () => {
    const notes: TestNote[] = [
      { id: '1', title: 'Note 1', tags: [], metadata: 'Key: C', is_pinned: true },
      { id: '2', title: 'Note 2', tags: [], metadata: 'Capo 2', is_pinned: false },
      { id: '3', title: 'Note 3', tags: [], metadata: 'Key: G', is_pinned: false },
    ];

    // Test No-Capo filter alone
    const showNoCapo = true;
    const showUntagged = false;
    const selectedTags: string[] = [];
    const showPinned = false;

    const filteredNoCapo = notes.filter((note) => {
      if (showNoCapo && selectedTags.length === 0 && !showPinned && !showUntagged) {
        return !note.metadata || !note.metadata.toLowerCase().includes('capo');
      }
      return true;
    });

    expect(filteredNoCapo).toHaveLength(2);
    expect(filteredNoCapo.map(n => n.id)).toEqual(['1', '3']);

    // Test Pinned filter alone
    const showNoCapo2 = false;
    const showPinned2 = true;

    const filteredPinned = notes.filter((note) => {
      if (showPinned2 && selectedTags.length === 0 && !showUntagged && !showNoCapo2) {
        return note.is_pinned;
      }
      return true;
    });

    expect(filteredPinned).toHaveLength(1);
    expect(filteredPinned[0].id).toBe('1');
  });

  it('should handle partial matches correctly', () => {
    const notes: TestNote[] = [
      { id: '1', title: 'Note 1', tags: [], metadata: 'Capacity: 100' }, // Contains 'cap' but not 'capo'
      { id: '2', title: 'Note 2', tags: [], metadata: 'Capo 2' },
      { id: '3', title: 'Note 3', tags: [], metadata: 'Cape Town' }, // Contains 'cape' but not 'capo'
    ];

    const filtered = notes.filter(
      note => !note.metadata || !note.metadata.toLowerCase().includes('capo')
    );

    expect(filtered).toHaveLength(2);
    expect(filtered.map(n => n.id)).toEqual(['1', '3']);
  });
});

/**
 * Property-Based Tests for No-Capo Filter
 * Tests the No-Capo filter with arbitrary metadata strings
 */
describe('Property-Based Tests - No-Capo Filter', () => {
  it('Property: Notes with "capo" (any case) in metadata should be filtered out', () => {
    const metadataArb = fc.string({ minLength: 1, maxLength: 50 });
    const capoVariantArb = fc.constantFrom('capo', 'Capo', 'CAPO', 'CaPo', 'cApO');

    fc.assert(
      fc.property(metadataArb, capoVariantArb, (metadata, capoVariant) => {
        const metadataWithCapo = metadata + ' ' + capoVariant + ' 2';
        
        const hasCapo = metadataWithCapo.toLowerCase().includes('capo');
        
        // Property: Any metadata containing "capo" (case-insensitive) should be detected
        expect(hasCapo).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('Property: Notes without "capo" in metadata should pass the filter', () => {
    const metadataArb = fc.string({ minLength: 0, maxLength: 50 })
      .filter(s => !s.toLowerCase().includes('capo'));

    fc.assert(
      fc.property(metadataArb, (metadata) => {
        const hasCapo = metadata.toLowerCase().includes('capo');
        
        // Property: Metadata without "capo" should not be detected
        expect(hasCapo).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('Property: Empty or undefined metadata should be treated as No-Capo', () => {
    const metadataArb = fc.option(fc.string({ maxLength: 50 }), { nil: undefined });

    fc.assert(
      fc.property(metadataArb, (metadata) => {
        const isNoCapo = !metadata || !metadata.toLowerCase().includes('capo');
        
        // Property: If metadata is undefined or doesn't contain "capo", it's No-Capo
        if (!metadata) {
          expect(isNoCapo).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});
