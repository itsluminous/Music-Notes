"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SearchInputWithTagsProps {
  value: string;
  onChange: (value: string) => void;
  onAtIconClick: () => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  atButtonRef?: React.RefObject<HTMLButtonElement>;
}

const SEARCH_TAGS = ['@artist', '@composer', '@album', '@title', '@content', '@metadata', '@year'];

export function SearchInputWithTags({
  value,
  onChange,
  onAtIconClick,
  placeholder = "Search notes...",
  className,
  inputRef,
  atButtonRef
}: SearchInputWithTagsProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const highlightRef = React.useRef<HTMLDivElement>(null);

  // Synchronize scroll between input and highlight overlay
  const handleScroll = (e: React.UIEvent<HTMLInputElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Parse the value and highlight tags
  const renderHighlightedText = () => {
    if (!value) return null;

    const parts: { text: string; isTag: boolean }[] = [];
    let currentIndex = 0;
    
    // Find all tag occurrences
    const tagMatches: { index: number; tag: string }[] = [];
    SEARCH_TAGS.forEach(tag => {
      let index = value.indexOf(tag);
      while (index !== -1) {
        // Check if it's at word boundary (before and after)
        const charBefore = index > 0 ? value[index - 1] : ' ';
        const charAfter = index + tag.length < value.length ? value[index + tag.length] : ' ';
        const isWordBoundaryBefore = charBefore === ' ' || index === 0;
        const isWordBoundaryAfter = charAfter === ' ' || index + tag.length === value.length;
        
        if (isWordBoundaryBefore && isWordBoundaryAfter) {
          tagMatches.push({ index, tag });
        }
        index = value.indexOf(tag, index + 1);
      }
    });

    // Sort by index
    tagMatches.sort((a, b) => a.index - b.index);

    // Build parts array
    tagMatches.forEach(match => {
      if (match.index > currentIndex) {
        parts.push({ text: value.substring(currentIndex, match.index), isTag: false });
      }
      parts.push({ text: match.tag, isTag: true });
      currentIndex = match.index + match.tag.length;
    });

    if (currentIndex < value.length) {
      parts.push({ text: value.substring(currentIndex), isTag: false });
    }

    return (
      <>
        {parts.map((part, index) => (
          <span
            key={index}
            className={part.isTag ? "bg-accent/50" : ""}
          >
            {part.text}
          </span>
        ))}
      </>
    );
  };

  return (
    <div className={cn("relative", className)}>
      <Button
        ref={atButtonRef}
        variant="ghost"
        size="sm"
        className="absolute left-2 top-2 h-6 w-6 p-0 bg-accent/50 hover:bg-accent z-10 rounded"
        onClick={onAtIconClick}
        aria-label="Show search tag suggestions"
      >
        <Search className="h-4 w-4 text-muted-foreground" />
      </Button>
      
      {/* Highlight overlay */}
      <div
        ref={highlightRef}
        className="absolute left-0 top-0 w-full h-full pointer-events-none overflow-hidden rounded-lg"
        aria-hidden="true"
      >
        <div className="w-full h-full flex items-center pl-10 pr-8 text-sm whitespace-pre overflow-x-auto no-scrollbar text-foreground">
          <span className="select-none" style={{ color: 'transparent' }}>
            {renderHighlightedText()}
          </span>
        </div>
      </div>

      {/* Actual input */}
      <input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        aria-label="Search notes with optional tags"
        className={cn(
          "w-full h-10 rounded-lg bg-secondary pl-10 pr-8 text-sm",
          "border-0 outline-none ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "relative z-[5]"
        )}
        style={{
          background: 'transparent',
          caretColor: 'currentColor'
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onScroll={handleScroll}
      />

      {/* Background layer */}
      <div 
        className={cn(
          "absolute left-0 top-0 w-full h-full rounded-lg bg-secondary -z-10",
          isFocused && "ring-2 ring-ring ring-offset-2 ring-offset-background"
        )}
      />

      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2.5 top-2.5 h-4 w-4 p-0 hover:bg-transparent z-10"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </Button>
      )}
    </div>
  );
}
