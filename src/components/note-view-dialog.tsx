"use client";

import * as React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { parseCapoValue } from '@/lib/music-utils';
import type { Note, Tag } from '@/lib/types';
import { NoteViewHeader } from './note-view/header';
import { NoteViewContent } from './note-view/content';
import { NoteViewFooter } from './note-view/footer';

interface NoteViewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  note: Note;
  allTags: Tag[];
  onEdit: () => void;
  onDeleted?: (id: string) => void;
  onPinToggled?: () => void;
}

export function NoteViewDialog({
  isOpen,
  onOpenChange,
  note,
  allTags,
  onEdit,
  onDeleted,
  onPinToggled,
}: NoteViewDialogProps) {
  const [initialCapo, setInitialCapo] = React.useState(0);
  const [manualTransposeSteps, setManualTransposeSteps] = React.useState(0);
  const [scrollSpeed, setScrollSpeed] = React.useState<number>(0);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const intervalRef = React.useRef<number | null>(null);
  const scrollSpeedRef = React.useRef<number>(scrollSpeed);

  React.useEffect(() => {
    if (isOpen) {
      const capoValue = parseCapoValue(note.metadata);
      setInitialCapo(capoValue);
      setManualTransposeSteps(0);
    }
  }, [isOpen, note.metadata]);

  React.useEffect(() => {
    scrollSpeedRef.current = scrollSpeed;
  }, [scrollSpeed]);

  // Manage autoscroll interval
  React.useEffect(() => {
    const clearInterval = () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Clear the interval if scrollSpeed is 0 or dialog is closed
    if (scrollSpeed === 0 || !isOpen) {
      clearInterval();
      return;
    }

    intervalRef.current = window.setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      const delta = scrollSpeedRef.current;
      let next = el.scrollTop + delta;
      if (next <= 0) next = 0;
      if (next >= max) next = max;
      if (next === el.scrollTop) {
        setScrollSpeed(0);
      } else {
        el.scrollTop = next;
      }
    }, 1000);

    return clearInterval;
  }, [scrollSpeed, isOpen]);

  const displayTranspose = initialCapo + manualTransposeSteps;
  const effectiveTranspose = manualTransposeSteps;

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) {
          setScrollSpeed(0);
        }
        onOpenChange(open);
      }}>
      <DialogContent className="sm:max-w-3xl h-[90vh] !flex !flex-col !overflow-hidden p-0">
        <NoteViewHeader
          note={note}
          onEdit={onEdit}
          onDeleted={onDeleted}
          onPinToggled={onPinToggled}
          onOpenChange={(open) => {
            if (!open) {
              setScrollSpeed(0);
            }
            onOpenChange(open);
          }}
        />
        <NoteViewContent
          note={note}
          allTags={allTags}
          effectiveTranspose={effectiveTranspose}
          scrollRef={scrollRef}
        />
        <NoteViewFooter
          displayTranspose={displayTranspose}
          scrollSpeed={scrollSpeed}
          onTransposeChange={(steps) => setManualTransposeSteps(s => s + steps)}
          onScrollSpeedChange={setScrollSpeed}
        />
      </DialogContent>
    </Dialog>
  );
}