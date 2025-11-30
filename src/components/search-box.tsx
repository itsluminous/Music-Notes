"use client"

import * as React from "react"
import { SearchInputWithTags } from "@/components/search-input-with-tags"
import { TagSuggestionDropdown } from "@/components/tag-suggestion-dropdown"

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SearchBox({ value, onChange, className }: SearchBoxProps) {
  const [showTagDropdown, setShowTagDropdown] = React.useState(false);
  const [tagFilterText, setTagFilterText] = React.useState('');
  const [cursorPosition, setCursorPosition] = React.useState(0);
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0 });
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const atButtonRef = React.useRef<HTMLButtonElement>(null);

  // Handle @ icon click
  const handleAtIconClick = () => {
    setShowTagDropdown(true);
    setTagFilterText('');
    searchInputRef.current?.focus();
    
    // Calculate dropdown position relative to the @ button
    if (atButtonRef.current) {
      const buttonRect = atButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: buttonRect.bottom + 4,
        left: buttonRect.left
      });
    }
  };

  // Handle search input change with @ detection
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    onChange(newValue);
    setCursorPosition(cursorPos);
    
    // Detect @ character
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Check if @ is at word boundary (start of string or after space)
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if (charBeforeAt === ' ' || lastAtIndex === 0) {
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        // Only show dropdown if there's no space after @
        if (!textAfterAt.includes(' ')) {
          setTagFilterText(textAfterAt);
          setShowTagDropdown(true);
          
          // Calculate dropdown position relative to the @ button
          if (atButtonRef.current) {
            const buttonRect = atButtonRef.current.getBoundingClientRect();
            setDropdownPosition({
              top: buttonRect.bottom + 4,
              left: buttonRect.left
            });
          }
          return;
        }
      }
    }
    
    // Close dropdown if @ is not detected
    setShowTagDropdown(false);
  };

  // Handle tag selection
  const handleTagSelect = (tag: string) => {
    if (!searchInputRef.current) return;
    
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    
    // Find the @ symbol before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Replace from @ to cursor with the selected tag
      const beforeAt = value.substring(0, lastAtIndex);
      const newValue = beforeAt + tag + ' ' + textAfterCursor;
      const newCursorPos = lastAtIndex + tag.length + 1;
      
      onChange(newValue);
      setShowTagDropdown(false);
      setTagFilterText('');
      
      // Set cursor position after tag
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    } else {
      // If no @ found, insert at cursor position
      const newValue = textBeforeCursor + tag + ' ' + textAfterCursor;
      const newCursorPos = cursorPosition + tag.length + 1;
      
      onChange(newValue);
      setShowTagDropdown(false);
      setTagFilterText('');
      
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  // Close tag dropdown
  const handleCloseTagDropdown = () => {
    setShowTagDropdown(false);
    setTagFilterText('');
  };

  return (
    <div className={className}>
      <SearchInputWithTags
        value={value}
        onChange={(newValue) => {
          // Simulate the event for handleSearchInputChange
          const syntheticEvent = {
            target: { value: newValue, selectionStart: newValue.length },
            currentTarget: { value: newValue, selectionStart: newValue.length }
          } as React.ChangeEvent<HTMLInputElement>;
          handleSearchInputChange(syntheticEvent);
        }}
        onAtIconClick={handleAtIconClick}
        placeholder="Search notes..."
        inputRef={searchInputRef}
        atButtonRef={atButtonRef}
      />
      <TagSuggestionDropdown
        isOpen={showTagDropdown}
        onSelect={handleTagSelect}
        onClose={handleCloseTagDropdown}
        filterText={tagFilterText}
        position={dropdownPosition}
      />
    </div>
  );
}
