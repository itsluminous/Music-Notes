"use client";

import * as React from 'react';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Note } from '@/lib/types';

interface NoteViewHeaderProps {
  note: Note;
  onEdit: () => void;
  onDeleted?: (id: string) => void;
  onOpenChange: (isOpen: boolean) => void;
}

export function NoteViewHeader({ note, onEdit, onDeleted, onOpenChange }: NoteViewHeaderProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = React.useState(false);

  return (
    <DialogHeader className="p-6 pb-0 flex-shrink-0">
      <div className="flex items-center justify-between w-full">
        <div>
          <DialogTitle className="font-headline text-2xl">{note.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-4 pt-1">
            {note.artist && <span>{note.artist}</span>}
            {note.artist && note.album && <span className="text-muted-foreground">&bull;</span>}
            {note.album && <span className="italic">{note.album}</span>}
          </DialogDescription>
        </div>

        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="More" className="font-bold text-lg">
                &#8942;
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-44">
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onEdit(); }}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Delete</DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete note</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this note? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          try {
                            setIsDeleting(true);
                            const { error } = await supabase.from('notes').delete().eq('id', note.id).limit(1);
                            if (error) throw error;
                            toast({ title: 'Deleted', description: 'Note deleted successfully.' });
                            onOpenChange(false);
                            if (typeof onDeleted === 'function') onDeleted(note.id);
                          } catch (err: any) {
                            console.error('Failed to delete note', err);
                            toast({ title: 'Error', description: err.message || 'Failed to delete note.' });
                          } finally {
                            setIsDeleting(false);
                          }
                        }}
                      >
                        {isDeleting ? 'Deleting…' : 'Delete'}
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </DialogHeader>
  );
}