"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type SearchTag = 'artist' | 'composer' | 'album' | 'title' | 'content' | 'metadata' | 'year';

export interface TagSuggestion {
  value: string;
  label: string;
  description: string;
  tag: SearchTag;
}

export const AVAILABLE_TAGS: TagSuggestion[] = [
  { value: '@artist', label: 'Artist', description: 'Search by artist name', tag: 'artist' },
  { value: '@composer', label: 'Composer', description: 'Search by composer name', tag: 'composer' },
  { value: '@album', label: 'Album', description: 'Search by album name', tag: 'album' },
  { value: '@title', label: 'Title', description: 'Search by note title', tag: 'title' },
  { value: '@content', label: 'Content', description: 'Search in note content', tag: 'content' },
  { value: '@metadata', label: 'Metadata', description: 'Search in metadata', tag: 'metadata' },
  { value: '@year', label: 'Year', description: 'Search by release year', tag: 'year' }
];

export interface TagSuggestionDropdownProps {
  isOpen: boolean;
  onSelect: (tag: string) => void;
  onClose: () => void;
  filterText?: string;
  position: { top: number; left: number };
}

export function TagSuggestionDropdown({
  isOpen,
  onSelect,
  onClose,
  filterText = '',
  position
}: TagSuggestionDropdownProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Filter tags based on filterText
  const filteredTags = React.useMemo(() => {
    if (!filterText) return AVAILABLE_TAGS;
    const lowerFilter = filterText.toLowerCase();
    return AVAILABLE_TAGS.filter(tag => 
      tag.tag.toLowerCase().includes(lowerFilter) ||
      tag.label.toLowerCase().includes(lowerFilter)
    );
  }, [filterText]);

  // Reset selected index when filtered tags change
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [filteredTags]);

  // Handle keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredTags.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
      } else if (e.key === 'Enter' && filteredTags.length > 0) {
        e.preventDefault();
        onSelect(filteredTags[selectedIndex].value);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredTags, onSelect, onClose]);

  // Handle click outside
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use setTimeout to avoid closing immediately when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={cn(
        "fixed z-50 min-w-[240px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        "animate-in fade-in-0 zoom-in-95"
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
      role="listbox"
      aria-label="Search tag suggestions"
      aria-activedescendant={filteredTags.length > 0 ? `tag-option-${selectedIndex}` : undefined}
    >
      {filteredTags.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          No tags found
        </div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto">
          {filteredTags.map((tag, index) => (
            <div
              key={tag.value}
              id={`tag-option-${index}`}
              role="option"
              aria-selected={index === selectedIndex}
              aria-label={`${tag.value} - ${tag.description}`}
              className={cn(
                "relative flex cursor-pointer select-none items-start gap-2 rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                index === selectedIndex 
                  ? "bg-accent text-accent-foreground" 
                  : "hover:bg-accent/50"
              )}
              onClick={() => onSelect(tag.value)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex flex-col gap-0.5">
                <div className="font-medium">{tag.value}</div>
                <div className="text-xs text-muted-foreground">{tag.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
