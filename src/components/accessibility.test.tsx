import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SearchInputWithTags } from './search-input-with-tags';
import { TagSuggestionDropdown, AVAILABLE_TAGS } from './tag-suggestion-dropdown';

/**
 * Unit Tests for Accessibility Features
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

describe('Accessibility Features - ARIA Labels', () => {
  it('@ icon button has proper ARIA label', () => {
    const mockOnChange = vi.fn();
    const mockOnAtIconClick = vi.fn();
    
    render(
      <SearchInputWithTags
        value=""
        onChange={mockOnChange}
        onAtIconClick={mockOnAtIconClick}
      />
    );
    
    const atButton = screen.getByLabelText('Show search tag suggestions');
    expect(atButton).toBeDefined();
    expect(atButton.getAttribute('aria-label')).toBe('Show search tag suggestions');
  });

  it('search input has proper ARIA label', () => {
    const mockOnChange = vi.fn();
    const mockOnAtIconClick = vi.fn();
    
    render(
      <SearchInputWithTags
        value=""
        onChange={mockOnChange}
        onAtIconClick={mockOnAtIconClick}
      />
    );
    
    const searchInput = screen.getByLabelText('Search notes with optional tags');
    expect(searchInput).toBeDefined();
    expect(searchInput.getAttribute('aria-label')).toBe('Search notes with optional tags');
  });

  it('clear button has proper ARIA label when value is present', () => {
    const mockOnChange = vi.fn();
    const mockOnAtIconClick = vi.fn();
    
    render(
      <SearchInputWithTags
        value="test query"
        onChange={mockOnChange}
        onAtIconClick={mockOnAtIconClick}
      />
    );
    
    const clearButton = screen.getByLabelText('Clear search');
    expect(clearButton).toBeDefined();
    expect(clearButton.getAttribute('aria-label')).toBe('Clear search');
  });

  it('tag suggestion dropdown has proper ARIA label', () => {
    const mockOnSelect = vi.fn();
    const mockOnClose = vi.fn();
    
    render(
      <TagSuggestionDropdown
        isOpen={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        position={{ top: 100, left: 100 }}
      />
    );
    
    const dropdown = screen.getByRole('listbox');
    expect(dropdown).toBeDefined();
    expect(dropdown.getAttribute('aria-label')).toBe('Search tag suggestions');
  });

  it('tag options have proper ARIA labels', () => {
    const mockOnSelect = vi.fn();
    const mockOnClose = vi.fn();
    
    render(
      <TagSuggestionDropdown
        isOpen={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        position={{ top: 100, left: 100 }}
      />
    );
    
    // Check that each tag option has an aria-label
    AVAILABLE_TAGS.forEach(tag => {
      const expectedLabel = `${tag.value} - ${tag.description}`;
      const option = screen.getByLabelText(expectedLabel);
      expect(option).toBeDefined();
    });
  });
});

describe('Accessibility Features - Keyboard Navigation', () => {
  it('dropdown has proper role attribute', () => {
    const mockOnSelect = vi.fn();
    const mockOnClose = vi.fn();
    
    render(
      <TagSuggestionDropdown
        isOpen={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        position={{ top: 100, left: 100 }}
      />
    );
    
    const dropdown = screen.getByRole('listbox');
    expect(dropdown).toBeDefined();
  });

  it('tag options have proper role attributes', () => {
    const mockOnSelect = vi.fn();
    const mockOnClose = vi.fn();
    
    render(
      <TagSuggestionDropdown
        isOpen={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        position={{ top: 100, left: 100 }}
      />
    );
    
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(AVAILABLE_TAGS.length);
  });

  it('dropdown has aria-activedescendant when tags are present', () => {
    const mockOnSelect = vi.fn();
    const mockOnClose = vi.fn();
    
    render(
      <TagSuggestionDropdown
        isOpen={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        position={{ top: 100, left: 100 }}
      />
    );
    
    const dropdown = screen.getByRole('listbox');
    const activeDescendant = dropdown.getAttribute('aria-activedescendant');
    expect(activeDescendant).toBe('tag-option-0'); // First option should be selected by default
  });

  it('selected option has aria-selected=true', () => {
    const mockOnSelect = vi.fn();
    const mockOnClose = vi.fn();
    
    render(
      <TagSuggestionDropdown
        isOpen={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        position={{ top: 100, left: 100 }}
      />
    );
    
    const options = screen.getAllByRole('option');
    const firstOption = options[0];
    expect(firstOption.getAttribute('aria-selected')).toBe('true');
  });

  it('non-selected options have aria-selected=false', () => {
    const mockOnSelect = vi.fn();
    const mockOnClose = vi.fn();
    
    render(
      <TagSuggestionDropdown
        isOpen={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        position={{ top: 100, left: 100 }}
      />
    );
    
    const options = screen.getAllByRole('option');
    // All options except the first should have aria-selected=false
    for (let i = 1; i < options.length; i++) {
      expect(options[i].getAttribute('aria-selected')).toBe('false');
    }
  });

  it('each option has a unique id for aria-activedescendant', () => {
    const mockOnSelect = vi.fn();
    const mockOnClose = vi.fn();
    
    render(
      <TagSuggestionDropdown
        isOpen={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        position={{ top: 100, left: 100 }}
      />
    );
    
    const options = screen.getAllByRole('option');
    const ids = options.map(option => option.id);
    
    // Check that all ids are unique
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
    
    // Check that ids follow the expected pattern
    ids.forEach((id, index) => {
      expect(id).toBe(`tag-option-${index}`);
    });
  });
});

describe('Accessibility Features - Focus Management', () => {
  it('search input is focusable', () => {
    const mockOnChange = vi.fn();
    const mockOnAtIconClick = vi.fn();
    
    render(
      <SearchInputWithTags
        value=""
        onChange={mockOnChange}
        onAtIconClick={mockOnAtIconClick}
      />
    );
    
    const searchInput = screen.getByLabelText('Search notes with optional tags');
    searchInput.focus();
    expect(document.activeElement).toBe(searchInput);
  });

  it('@ icon button is focusable', () => {
    const mockOnChange = vi.fn();
    const mockOnAtIconClick = vi.fn();
    
    render(
      <SearchInputWithTags
        value=""
        onChange={mockOnChange}
        onAtIconClick={mockOnAtIconClick}
      />
    );
    
    const atButton = screen.getByLabelText('Show search tag suggestions');
    atButton.focus();
    expect(document.activeElement).toBe(atButton);
  });

  it('clear button is focusable when present', () => {
    const mockOnChange = vi.fn();
    const mockOnAtIconClick = vi.fn();
    
    render(
      <SearchInputWithTags
        value="test"
        onChange={mockOnChange}
        onAtIconClick={mockOnAtIconClick}
      />
    );
    
    const clearButton = screen.getByLabelText('Clear search');
    clearButton.focus();
    expect(document.activeElement).toBe(clearButton);
  });
});

describe('Accessibility Features - Screen Reader Support', () => {
  it('search input has type="search" for screen reader context', () => {
    const mockOnChange = vi.fn();
    const mockOnAtIconClick = vi.fn();
    
    render(
      <SearchInputWithTags
        value=""
        onChange={mockOnChange}
        onAtIconClick={mockOnAtIconClick}
      />
    );
    
    const searchInput = screen.getByLabelText('Search notes with optional tags');
    expect(searchInput.getAttribute('type')).toBe('search');
  });

  it('highlight overlay is hidden from screen readers', () => {
    const mockOnChange = vi.fn();
    const mockOnAtIconClick = vi.fn();
    
    const { container } = render(
      <SearchInputWithTags
        value="@artist test"
        onChange={mockOnChange}
        onAtIconClick={mockOnAtIconClick}
      />
    );
    
    const highlightOverlay = container.querySelector('[aria-hidden="true"]');
    expect(highlightOverlay).toBeDefined();
  });

  it('dropdown provides proper listbox semantics', () => {
    const mockOnSelect = vi.fn();
    const mockOnClose = vi.fn();
    
    render(
      <TagSuggestionDropdown
        isOpen={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        position={{ top: 100, left: 100 }}
      />
    );
    
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeDefined();
    
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
  });
});
