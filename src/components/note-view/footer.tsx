"use client";

import * as React from 'react';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Minus, Plus, ChevronUp, ChevronDown } from 'lucide-react';

interface NoteViewFooterProps {
  displayTranspose: number;
  scrollSpeed: number;
  onTransposeChange: (steps: number) => void;
  onScrollSpeedChange: (speed: number) => void;
}

export function NoteViewFooter({
  displayTranspose,
  scrollSpeed,
  onTransposeChange,
  onScrollSpeedChange,
}: NoteViewFooterProps) {
  return (
    <DialogFooter className="flex-shrink-0 p-6 pt-4 border-t flex flex-row items-center w-full">
      <div className="flex items-center gap-2 flex-1">
        <span className="text-sm font-medium">Transpose:</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onTransposeChange(-1)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="font-bold w-4 text-center">
          {displayTranspose > 0 ? '+' : ''}
          {displayTranspose}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onTransposeChange(1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-sm font-medium">AutoScroll:</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onScrollSpeedChange(Math.max(-20, scrollSpeed - 1))}
          title="Decrease speed / reverse"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <span className="font-bold w-4 text-center">{scrollSpeed}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onScrollSpeedChange(Math.min(20, scrollSpeed + 1))}
          title="Increase speed"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      </div>
    </DialogFooter>
  );
}