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
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { PendingApprovalNotification } from '@/components/pending-approval-notification';
import { handlePotentialAccountRemoval } from '@/lib/account-removal-handler';
import type { Note } from '@/lib/types';

interface NoteViewHeaderProps {
  note: Note;
  onEdit: () => void;
  onDeleted?: (id: string) => void;
  onPinToggled?: () => void;
  onOpenChange: (isOpen: boolean) => void;
}

export function NoteViewHeader({ note, onEdit, onDeleted, onPinToggled, onOpenChange }: NoteViewHeaderProps) {
  const { toast } = useToast();
  const { user, isPending, profile, loading } = useAuth();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isPinning, setIsPinning] = React.useState(false);
  const [pendingDialogOpen, setPendingDialogOpen] = React.useState(false);

  const handleEdit = () => {
    // Wait for auth to finish loading
    if (loading) {
      return;
    }
    
    // Check authentication status before editing
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    // Show pending approval dialog if user is pending
    if (isPending) {
      setPendingDialogOpen(true);
      return;
    }
    
    onEdit();
  };

  const handlePinToggle = async () => {
    // Wait for auth to finish loading
    if (loading) {
      return;
    }
    
    // Check authentication status before pinning
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    // Show pending approval dialog if user is pending
    if (isPending) {
      setPendingDialogOpen(true);
      return;
    }
    
    try {
      setIsPinning(true);
      const { error } = await supabase
        .from('notes')
        .update({ is_pinned: !note.is_pinned })
        .eq('id', note.id);
      
      if (error) throw error;
      
      toast({ 
        title: note.is_pinned ? 'Unpinned' : 'Pinned', 
        description: `Note ${note.is_pinned ? 'unpinned' : 'pinned'} successfully.` 
      });
      
      // Notify parent to refresh data
      if (onPinToggled) {
        onPinToggled();
      }
      
      // Close dialog
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to toggle pin', err);
      toast({ title: 'Error', description: err.message || 'Failed to update note.' });
    } finally {
      setIsPinning(false);
    }
  };

  const handleDelete = async () => {
    // Wait for auth to finish loading
    if (loading) {
      return;
    }
    
    // Check authentication status before deleting
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    // Show pending approval dialog if user is pending
    if (isPending) {
      setPendingDialogOpen(true);
      return;
    }
    
    try {
      setIsDeleting(true);
      const { error } = await supabase.from('notes').delete().eq('id', note.id).limit(1);
      if (error) {
        // Check if user profile was deleted (RLS policy violation)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await handlePotentialAccountRemoval(user.id, error);
        }
        throw error;
      }
      toast({ title: 'Deleted', description: 'Note deleted successfully.' });
      onOpenChange(false);
      if (typeof onDeleted === 'function') onDeleted(note.id);
    } catch (err: any) {
      console.error('Failed to delete note', err);
      toast({ title: 'Error', description: err.message || 'Failed to delete note.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DialogHeader className="p-6 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between w-full">
          <div>
            <DialogTitle className="font-headline text-2xl">{note.title}</DialogTitle>
            <DialogDescription className="flex items-center gap-4 pt-1">
              {note.artist && <span>{note.artist}</span>}
              {note.artist && (note.album || note.release_year) && <span className="text-muted-foreground">&bull;</span>}
              {note.album && <span className="italic">{note.album}</span>}
              {note.album && note.release_year && <span className="text-muted-foreground">&bull;</span>}
              {note.release_year && <span>{note.release_year}</span>}
            </DialogDescription>
            {(note.author_name || note.author_email) && (
              <DialogDescription className="pt-1 text-xs">
                Author: {note.author_name || note.author_email}
              </DialogDescription>
            )}
          </div>

          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="More" className="font-bold text-lg">
                  &#8942;
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-44">
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleEdit(); }}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handlePinToggle(); }} disabled={isPinning}>
                  {isPinning ? 'Updating...' : (note.is_pinned ? 'Unpin' : 'Pin')}
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
                          onClick={handleDelete}
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
      <PendingApprovalNotification 
        isOpen={pendingDialogOpen} 
        onOpenChange={setPendingDialogOpen}
        email={profile?.email}
      />
    </>
  );
}