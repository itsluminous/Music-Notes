"use client";

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { highlightChordsAndCode, linkify, isLinkPart } from '@/lib/music-utils';
import type { Note, Tag } from '@/lib/types';
import { cn } from '@/lib/utils';

interface NoteViewContentProps {
  note: Note;
  allTags: Tag[];
  effectiveTranspose: number;
  scrollRef: React.RefObject<HTMLDivElement>;
}

export function NoteViewContent({ note, allTags, effectiveTranspose, scrollRef }: NoteViewContentProps) {
  const noteTags = note.tags.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) as Tag[];
  const formattedCreationDate = format(new Date((note as any).created_at), "MMM d, yyyy 'at' h:mm a");
  const rawUpdatedAt = (note as any).updated_at;
  let formattedUpdateDate = rawUpdatedAt ? format(new Date(rawUpdatedAt), "MMM d, yyyy 'at' h:mm a") : null;
  if (formattedUpdateDate === formattedCreationDate) {
    formattedUpdateDate = null;
  }

  console.log('NoteViewContent rendering with:', { note, effectiveTranspose });
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div 
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto px-6",
          "relative" // for debugging
        )}
      >
        <div>
          {note.metadata && (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
              {linkify(note.metadata).map((part, index) =>
                isLinkPart(part) ? (
                  <a
                    key={index}
                    href={part.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80"
                  >
                    {part.text}
                  </a>
                ) : (
                  <React.Fragment key={index}>{part.text}</React.Fragment>
                )
              )}
            </div>
          )}
          <div className="whitespace-pre-wrap text-base font-body leading-relaxed  py-4">
            {highlightChordsAndCode(note.content, effectiveTranspose)}
          </div>
          
          {note.references && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-semibold text-sm mb-2">References</h4>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                {linkify(note.references).map((part, index) =>
                  isLinkPart(part) ? (
                    <a
                      key={index}
                      href={part.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80"
                    >
                      {part.text}
                    </a>
                  ) : (
                    <React.Fragment key={index}>{part.text}</React.Fragment>
                  )
                )}
              </div>
            </div>
          )}
          
          <div className="pt-6 mt-6 border-t">
            <div className="flex flex-wrap gap-2">
              {noteTags.map(tag => (
                <Badge key={tag.id} variant="secondary" className="font-normal">
                  {tag.name}
                </Badge>
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-4 space-y-1">
              <p>Created: {formattedCreationDate}</p>
              {formattedUpdateDate && <p>Updated: {formattedUpdateDate}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}