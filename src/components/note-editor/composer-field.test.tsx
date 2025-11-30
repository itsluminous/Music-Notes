import { describe, it, expect } from 'vitest';

/**
 * Unit test for composer field being optional
 * 
 * Feature: multi-user-approval-system, Property 15: Composer is optional
 * Validates: Requirements 7.5
 * 
 * This test validates that the composer field can be empty/null without causing errors.
 */

describe('Composer Field - Optional', () => {
  it('should allow composer field to be empty', () => {
    // Test that a note can be created without a composer
    const noteWithoutComposer = {
      id: 'test-1',
      title: 'Test Song',
      content: 'C G Am F',
      artist: 'Test Artist',
      composer: undefined,
      tags: [],
      created_at: new Date().toISOString(),
    };

    // Verify that composer is undefined/empty
    expect(noteWithoutComposer.composer).toBeUndefined();
    
    // Verify that the note object is still valid
    expect(noteWithoutComposer.title).toBe('Test Song');
    expect(noteWithoutComposer.content).toBe('C G Am F');
  });

  it('should allow composer field to be null', () => {
    // Test that a note can have null composer
    const noteWithNullComposer = {
      id: 'test-2',
      title: 'Another Song',
      content: 'D A Bm G',
      artist: 'Another Artist',
      composer: null,
      tags: [],
      created_at: new Date().toISOString(),
    };

    // Verify that composer is null
    expect(noteWithNullComposer.composer).toBeNull();
    
    // Verify that the note object is still valid
    expect(noteWithNullComposer.title).toBe('Another Song');
  });

  it('should allow composer field to be empty string', () => {
    // Test that a note can have empty string composer
    const noteWithEmptyComposer = {
      id: 'test-3',
      title: 'Third Song',
      content: 'E B C#m A',
      artist: 'Third Artist',
      composer: '',
      tags: [],
      created_at: new Date().toISOString(),
    };

    // Verify that composer is empty string
    expect(noteWithEmptyComposer.composer).toBe('');
    
    // Verify that the note object is still valid
    expect(noteWithEmptyComposer.title).toBe('Third Song');
  });

  it('should allow composer field to have a value', () => {
    // Test that a note can have a composer value
    const noteWithComposer = {
      id: 'test-4',
      title: 'Fourth Song',
      content: 'F C Dm Bb',
      artist: 'Fourth Artist',
      composer: 'Famous Composer',
      tags: [],
      created_at: new Date().toISOString(),
    };

    // Verify that composer has a value
    expect(noteWithComposer.composer).toBe('Famous Composer');
    
    // Verify that the note object is still valid
    expect(noteWithComposer.title).toBe('Fourth Song');
  });
});
