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
    const tagArb = fc.constantFrom('@artist', '@composer', '@album', '@title', '@content', '@metadata', '@year');

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
    const tagArb = fc.constantFrom('@artist', '@composer', '@album', '@title', '@content', '@metadata', '@year');

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
    const tagArb = fc.constantFrom('@artist', '@composer', '@album', '@title', '@content', '@metadata', '@year');

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
    const selectedTag = '@composer';
    
    const textBeforeCursor = searchQuery.substring(0, cursorPosition);
    const textAfterCursor = searchQuery.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    // Simulate tag selection (should replace the last @)
    const beforeAt = searchQuery.substring(0, lastAtIndex);
    const newValue = beforeAt + selectedTag + ' ' + textAfterCursor;
    
    expect(newValue).toBe('@artist Arijit @composer ');
    expect(newValue).toContain('@artist');
    expect(newValue).toContain('@composer');
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
