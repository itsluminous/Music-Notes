
"use client";

import * as React from 'react';
import { Plus, Search, Music, ListFilter, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarInset,
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
import { allNotes, allTags } from '@/lib/mock-data';
import type { Note, Tag } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Home() {
  const [notes, setNotes] = React.useState<Note[]>(allNotes);
  const [tags, setTags] = React.useState<Tag[]>(allTags);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [editingNote, setEditingNote] = React.useState<Note | null>(null);
  const [viewingNote, setViewingNote] = React.useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const filteredNotes = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // Filter by tags first
    const notesWithTags = notes.filter((note) => {
      if (selectedTags.length === 0) return true;
      return selectedTags.every((tagId) => note.tags.includes(tagId));
    });

    if (!query) {
      return notesWithTags.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const searchWords = query.split(/\s+/).filter(Boolean);

    const getScore = (note: Note) => {
      const title = note.title.toLowerCase();
      const content = note.content.toLowerCase();
      const metadata = note.metadata?.toLowerCase() || '';
      const artist = note.artist?.toLowerCase() || '';
      const album = note.album?.toLowerCase() || '';
      
      const combinedContent = `${title} ${content} ${metadata} ${artist} ${album}`;

      // Check if all search words are present in the combined content
      const allWordsPresent = searchWords.every(word => combinedContent.includes(word));
      if (!allWordsPresent) {
        return 0; // If not all words are present, it's not a match
      }

      let score = 0;

      // 1. Highest preference: Exact match in title
      if (title === query) {
        score += 100;
      }

      // 2. Next preference: Exact match in metadata or body
      if (metadata === query || content === query) {
        score += 50;
      }
      
      // 3. Partial matches scoring
      searchWords.forEach(word => {
        if (title.includes(word)) score += 10;
        if (content.includes(word)) score += 1;
        if (metadata.includes(word)) score += 2;
        if (artist.includes(word)) score += 1;
        if (album.includes(word)) score += 1;
      });
      
      return score;
    };

    return notesWithTags
      .map(note => ({ note, score: getScore(note) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.note);

  }, [notes, searchQuery, selectedTags]);

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateNewNote = () => {
    setEditingNote(null);
    setIsEditorOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setIsViewOpen(false);
    setEditingNote(note);
    setIsEditorOpen(true);
  };
  
  const handleViewNote = (note: Note) => {
    setViewingNote(note);
    setIsViewOpen(true);
  }

  const handleSaveNote = (savedNote: Note) => {
    if (editingNote) {
      const updatedNote = { ...savedNote, updatedAt: new Date().toISOString() };
      setNotes(notes.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
    } else {
      setNotes([savedNote, ...notes]);
    }
    const newTags = savedNote.tags
      .map(tagId => tags.find(t => t.id === tagId) || { id: tagId, name: tagId }) // Create new tag if not found
      .filter(tag => !tags.some(t => t.id === tag.id));
      
    if (newTags.length > 0) {
      const uniqueNewTags = newTags.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      setTags([...tags, ...uniqueNewTags]);
    }

    setIsEditorOpen(false);
    setEditingNote(null);
  };
  
  const allArtists = React.useMemo(() => [...new Set(notes.flatMap(n => n.artist?.split(',').map(a => a.trim()) || []).filter(Boolean) as string[])], [notes]);
  const allAlbums = React.useMemo(() => [...new Set(notes.map(n => n.album).filter(Boolean) as string[])], [notes]);


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
          <div className="px-2 pb-2 text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ListFilter className="w-4 h-4" />
            <span>Filter by Tags</span>
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
        </SidebarMenu>
      </SidebarContent>
    </>
  );
  
  const renderEmptyState = () => {
    if (filteredNotes.length === 0 && (searchQuery || selectedTags.length > 0)) {
      return (
        <div className="text-center text-muted-foreground">
          <p>No notes found for the selected filters and search query.</p>
        </div>
      );
    }

    if (notes.length === 0) {
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
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search notes..."
              className="w-full rounded-lg bg-secondary pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <UserNav />
        </header>
        <div className="flex flex-1 pt-14">
          <Sidebar variant="sidebar" collapsible="icon" className="border-r">
            <TagSidebarContent />
          </Sidebar>

          <main className="flex-1 p-4 md:p-6 relative">
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
          />
        )}
      </div>
    </SidebarProvider>
  );
}
