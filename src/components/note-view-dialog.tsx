
"use client";

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Pencil, Minus, Plus } from 'lucide-react';
import { highlightChordsAndCode, linkify, isLinkPart, parseCapoValue } from '@/lib/music-utils';
import type { Note, Tag } from '@/lib/types';
import { format } from 'date-fns';

interface NoteViewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  note: Note;
  allTags: Tag[];
  onEdit: () => void;
}

export function NoteViewDialog({ isOpen, onOpenChange, note, allTags, onEdit }: NoteViewDialogProps) {
  const [initialCapo, setInitialCapo] = React.useState(0);
  const [manualTransposeSteps, setManualTransposeSteps] = React.useState(0);

  React.useEffect(() => {
    if (isOpen) {
      const capoValue = parseCapoValue(note.metadata);
      setInitialCapo(capoValue);
      setManualTransposeSteps(0); // Reset manual steps when opening
    }
  }, [isOpen, note.metadata]);

  const noteTags = note.tags.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) as Tag[];
  const formattedCreationDate = format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a");
  const formattedUpdateDate = note.updatedAt ? format(new Date(note.updatedAt), "MMM d, yyyy 'at' h:mm a") : null;
  
  // The value displayed in the UI is the sum of the capo and manual steps
  const displayTranspose = initialCapo + manualTransposeSteps;
  
  // The actual transposition applied to chords is only the manual adjustment
  const effectiveTranspose = manualTransposeSteps;


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0 flex-shrink-0">
          <DialogTitle className="font-headline text-2xl">{note.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-4 pt-1">
            {note.artist && <span>{note.artist}</span>}
            {note.artist && note.album && <span className="text-muted-foreground">&bull;</span>}
            {note.album && <span className="italic">{note.album}</span>}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ScrollArea className="h-full w-full">
            <div className="px-6">
              {note.metadata && (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{note.metadata}</div>
              )}
              <div className="whitespace-pre-wrap text-base font-body leading-relaxed">
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
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
          
        <DialogFooter className="flex-shrink-0 p-6 pt-4 border-t flex flex-row justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Transpose:</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setManualTransposeSteps(s => s - 1)}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="font-bold w-8 text-center">{displayTranspose > 0 ? '+' : ''}{displayTranspose}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setManualTransposeSteps(s => s + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
