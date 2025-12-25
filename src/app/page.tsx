"use client";

import * as React from 'react';
import { Plus, Music, ListFilter, Menu, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { NoteCard } from '@/components/note-card';
import { NoteEditorDialog } from '@/components/note-editor-dialog';
import { NoteViewDialog } from '@/components/note-view-dialog';
import { UserNav } from '@/components/user-nav';
import { PendingApprovalNotification } from '@/components/pending-approval-notification';
import { AccountRemovedNotification } from '@/components/account-removed-notification';
import { SearchBox } from '@/components/search-box';
import type { Note } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useNotesData } from '@/hooks/use-notes-data';
import { useAuth } from '@/hooks/use-auth';
import { useDebounce } from '@/hooks/use-debounce';
import { parseSearchQuery } from '@/lib/search-parser';
import { filterNotesByParsedQuery, rankSearchResults } from '@/lib/search-engine';

export default function Home() {
  const { notes, tags, loading: notesLoading, refreshing, fetchNotesAndTags, saveNote } = useNotesData();
  const { user, isPending, isApproved, profile, loading: authLoading, showAccountRemovedDialog, setShowAccountRemovedDialog } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [showUntagged, setShowUntagged] = React.useState(false);
  const [showPinned, setShowPinned] = React.useState(false);
  const [editingNote, setEditingNote] = React.useState<Note | null>(null);
  const [viewingNote, setViewingNote] = React.useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isPendingNotificationOpen, setIsPendingNotificationOpen] = React.useState(false);
  const [hasShownLoginNotification, setHasShownLoginNotification] = React.useState(false);
  const isMobile = useIsMobile();
  const router = useRouter();
  const { toast } = useToast();
  // notes/tags loading handled by useNotesData

  // No auth redirect - allow anonymous visitors to view notes
  
  // Show pending notification on login for pending users
  React.useEffect(() => {
    if (!authLoading && user && isPending && !hasShownLoginNotification) {
      setIsPendingNotificationOpen(true);
      setHasShownLoginNotification(true);
    }
  }, [user, isPending, authLoading, hasShownLoginNotification]);

  const filteredNotes = React.useMemo(() => {
    // Filter by tags first (existing tag filter functionality)
    const notesWithTags = notes.filter((note) => {
      // If 'Pinned' is selected, show only pinned notes
      if (showPinned && selectedTags.length === 0 && !showUntagged) {
        return note.is_pinned;
      }
      
      // If 'Untagged' is the only filter, show notes with no tags
      if (showUntagged && selectedTags.length === 0 && !showPinned) {
        return note.tags.length === 0;
      }
      
      // If other tags are selected, 'Untagged' and 'Pinned' are ignored
      if (selectedTags.length === 0 && !showUntagged && !showPinned) return true;
      return selectedTags.every((tagId) => note.tags.includes(tagId));
    });

    const query = debouncedSearchQuery.trim();

    // If no search query, return tag-filtered notes sorted by date
    if (!query) {
      return notesWithTags.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // Parse the search query to extract tagged and untagged terms
    const parsedQuery = parseSearchQuery(query);

    // Apply new search engine logic
    const filtered = filterNotesByParsedQuery(notesWithTags, parsedQuery);
    const ranked = rankSearchResults(filtered, parsedQuery);

    return ranked;

  }, [notes, debouncedSearchQuery, selectedTags, showUntagged, showPinned]);

  // Announce result count changes for screen readers
  const resultCountMessage = React.useMemo(() => {
    if (notesLoading) return 'Loading notes';
    if (filteredNotes.length === 0 && (debouncedSearchQuery || selectedTags.length > 0 || showUntagged || showPinned)) {
      return 'No notes found';
    }
    if (filteredNotes.length === 1) return '1 note found';
    return `${filteredNotes.length} notes found`;
  }, [filteredNotes.length, notesLoading, debouncedSearchQuery, selectedTags.length, showUntagged, showPinned]);

  const handleTagToggle = (tagId: string) => {
    if (tagId === 'untagged') {
      setShowUntagged(prev => !prev);
    } else if (tagId === 'pinned') {
      setShowPinned(prev => !prev);
    } else {
      setSelectedTags((prev) =>
        prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
      );
    }
  };

  const handleCreateNewNote = () => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }
    
    // Check authentication status before opening editor
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    // Show pending notification if user is pending
    if (isPending) {
      setIsPendingNotificationOpen(true);
      return;
    }
    
    setEditingNote(null);
    setIsEditorOpen(true);
  };

  const handleEditNote = (note: Note) => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }
    
    // Check authentication status before opening editor
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    // Show pending notification if user is pending
    if (isPending) {
      setIsPendingNotificationOpen(true);
      return;
    }
    
    setIsViewOpen(false);
    setEditingNote(note);
    setIsEditorOpen(true);
  };
  
  const handleViewNote = (note: Note) => {
    setViewingNote(note);
    setIsViewOpen(true);
  }

  const handleSaveNote = async (savedNote: Note) => {
    const ok = await saveNote(savedNote, editingNote);
    if (ok) {
      setIsEditorOpen(false);
      setEditingNote(null);
    }
  };
  
  const handleClearAllFilters = () => {
    setSelectedTags([]);
    setShowUntagged(false);
    setShowPinned(false);
  };

  const allArtists = React.useMemo(() => [...new Set(notes.flatMap(n => n.artist?.split(',').map(a => a.trim()) || []).filter(Boolean) as string[])], [notes]);
  const allAlbums = React.useMemo(() => [...new Set(notes.map(n => n.album).filter(Boolean) as string[])], [notes]);
  const hasPinnedNotes = React.useMemo(() => notes.some(note => note.is_pinned), [notes]);
  const hasActiveFilters = selectedTags.length > 0 || showUntagged || showPinned;


  const TagSidebarContent = () => (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 font-headline text-xl">
          <span>Filters</span>
        </div>
      </SidebarHeader>
      <Separator className="bg-border/50" />
      <SidebarContent>
        <SidebarMenu>
          <div className="px-2 pb-2 text-sm font-medium text-muted-foreground flex items-center justify-between">
            {hasActiveFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllFilters}
                className="h-6 text-xs border-primary/50 hover:border-primary mt-1"
              >
                Clear All
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <ListFilter className="w-4 h-4" />
                <span>Filter by Tags</span>
              </div>
            )}
          </div>
          {tags.map((tag) => (
            <SidebarMenuItem key={tag.id} className="px-2">
              <Label htmlFor={`tag-${tag.id}`} className="flex items-center gap-3 cursor-pointer w-full text-sm font-normal">
                <Checkbox
                  id={`tag-${tag.id}`}
                  checked={selectedTags.includes(tag.id)}
                  onCheckedChange={() => handleTagToggle(tag.id)}
                />
                {tag.name}
              </Label>
            </SidebarMenuItem>
          ))}
          <Separator className="my-2" />
          {hasPinnedNotes && (
            <SidebarMenuItem className="px-2">
              <Label htmlFor="tag-pinned" className="flex items-center gap-3 cursor-pointer w-full text-sm font-normal">
                <Checkbox
                  id="tag-pinned"
                  checked={showPinned}
                  onCheckedChange={() => handleTagToggle('pinned')}
                />
                Pinned
              </Label>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem className="px-2">
            <Label htmlFor="tag-untagged" className="flex items-center gap-3 cursor-pointer w-full text-sm font-normal">
              <Checkbox
                id="tag-untagged"
                checked={showUntagged}
                onCheckedChange={() => handleTagToggle('untagged')}
              />
              Untagged
            </Label>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </>
  );
  
  const renderEmptyState = () => {
    if (notesLoading) {
      return (
        <div className="text-center text-muted-foreground">
          <p>Fetching your notes…</p>
        </div>
      );
    }

    if (filteredNotes.length === 0 && (debouncedSearchQuery || selectedTags.length > 0 || showUntagged || showPinned)) {
      return (
        <div className="text-center text-muted-foreground">
          <p>No notes found for the selected filters and search query.</p>
        </div>
      );
    }

    if (!notesLoading && notes.length === 0) {
      return (
        <div className="text-center text-muted-foreground">
          <p>You don't have any notes yet.</p>
          <p>Click the '+' button to create one!</p>
        </div>
      );
    }
    
    return null;
  };

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full flex-col bg-background">
        <header className="fixed top-0 z-30 flex h-14 w-full items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
          <SidebarTrigger className="md:hidden">
            <Menu />
          </SidebarTrigger>
          <div className="flex items-center gap-2 font-headline text-xl">
              <Music className="h-6 w-6 text-primary" />
              <span className="hidden md:inline">Music</span>
          </div>
          {refreshing && (
            <div 
              className="flex items-center gap-2 text-xs text-muted-foreground"
              role="status"
              aria-live="polite"
              aria-label="Refreshing notes in background"
            >
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              <span className="hidden sm:inline">Refreshing...</span>
            </div>
          )}
          <SearchBox
            value={searchQuery}
            onChange={setSearchQuery}
            className="flex-1 max-w-md mx-auto md:max-w-lg"
          />
          <UserNav />
        </header>
        <div className="flex flex-1 pt-14">
          <Sidebar variant="sidebar" collapsible="icon" className="border-r">
            <TagSidebarContent />
          </Sidebar>

          <main className="flex-1 p-4 md:p-6 relative">
            {/* ARIA live region for search result announcements */}
            <div 
              className="sr-only" 
              role="status" 
              aria-live="polite" 
              aria-atomic="true"
            >
              {resultCountMessage}
            </div>
            <ScrollArea className="h-full">
              {filteredNotes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredNotes.map((note) => (
                    <NoteCard key={note.id} note={note} allTags={tags} onCardClick={() => handleViewNote(note)} />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  {renderEmptyState()}
                </div>
              )}
            </ScrollArea>
            <Button
              className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-lg"
              onClick={handleCreateNewNote}
            >
              <Plus className="h-8 w-8" />
              <span className="sr-only">Create new note</span>
            </Button>
          </main>
        </div>
        
        <NoteEditorDialog
          isOpen={isEditorOpen}
          onOpenChange={setIsEditorOpen}
          note={editingNote}
          onSave={handleSaveNote}
          allTags={tags}
          allArtists={allArtists}
          allAlbums={allAlbums}
        />
        
        {viewingNote && (
          <NoteViewDialog
            isOpen={isViewOpen}
            onOpenChange={setIsViewOpen}
            note={viewingNote}
            allTags={tags}
            onEdit={() => handleEditNote(viewingNote)}
            onDeleted={async (id: string) => {
              // Force full fetch to ensure deleted note is removed from cache
              await fetchNotesAndTags(true);
              setViewingNote(null);
              setIsViewOpen(false);
            }}
            onPinToggled={async () => {
              // Refresh notes to update pin status in the grid
              await fetchNotesAndTags();
            }}
          />
        )}
        
        <PendingApprovalNotification
          isOpen={isPendingNotificationOpen}
          onOpenChange={setIsPendingNotificationOpen}
          email={profile?.email}
        />
        
        <AccountRemovedNotification
          isOpen={showAccountRemovedDialog}
          onOpenChange={setShowAccountRemovedDialog}
        />
      </div>
    </SidebarProvider>
  );
}
