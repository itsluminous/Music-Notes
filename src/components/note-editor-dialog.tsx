"use client";

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { PlusCircle, X, Check } from 'lucide-react';
import type { Note, Tag } from '@/lib/types';
import { cn } from '@/lib/utils';

const noteSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  artist: z.string().optional(),
  album: z.string().optional(),
  metadata: z.string().optional(),
  references: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type NoteFormData = z.infer<typeof noteSchema>;

interface NoteEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  note: Note | null;
  onSave: (note: Note) => void;
  allTags: Tag[];
  allArtists: string[];
  allAlbums: string[];
}

export function NoteEditorDialog({ isOpen, onOpenChange, note, onSave, allTags, allArtists, allAlbums }: NoteEditorDialogProps) {
  const [artistInput, setArtistInput] = React.useState('');
  const [albumInput, setAlbumInput] = React.useState('');

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: '',
      content: '',
      artist: '',
      album: '',
      metadata: '',
      references: '',
      tags: [],
    },
  });

  const { watch, setValue } = form;
  const currentTags = watch('tags') || [];
  const currentArtists = watch('artist')?.split(',').map(a => a.trim()).filter(Boolean) || [];

  React.useEffect(() => {
    if (note) {
      form.reset({
        title: note.title,
        content: note.content,
        artist: note.artist || '',
        album: note.album || '',
        metadata: note.metadata || '',
        references: note.references || '',
        tags: note.tags || [],
      });
      setAlbumInput(note.album || '');
    } else {
      form.reset({ title: '', content: '', artist: '', album: '', metadata: '', references: '', tags: [] });
      setAlbumInput('');
    }
  }, [note, form, isOpen]);

  
  const onSubmit = (data: NoteFormData) => {
    const finalNote: Note = {
      id: note?.id || new Date().toISOString(),
      createdAt: note?.createdAt || new Date().toISOString(),
      ...data,
      artist: currentArtists.join(', '),
      tags: data.tags || [],
    };
    onSave(finalNote);
  };
  
  const handleAddTag = (tagId: string) => {
    if (!currentTags.includes(tagId)) {
      setValue('tags', [...currentTags, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setValue('tags', currentTags.filter(id => id !== tagId));
  };
  
  const handleCreateTag = (tagName: string) => {
    const newTagId = tagName.toLowerCase().replace(/\s+/g, '-');
    if (!allTags.some(t => t.id === newTagId) && !currentTags.includes(newTagId)) {
        setValue('tags', [...currentTags, newTagId]);
    } else if (allTags.some(t => t.id === newTagId) && !currentTags.includes(newTagId)) {
        handleAddTag(newTagId);
    }
  }
  
  const handleAddArtist = (artistName: string) => {
    if (artistName && !currentArtists.includes(artistName)) {
      setValue('artist', [...currentArtists, artistName].join(', '));
    }
    setArtistInput('');
  };

  const handleRemoveArtist = (artistName: string) => {
    setValue('artist', currentArtists.filter(name => name !== artistName).join(', '));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{note ? 'Edit Note' : 'Create Note'}</DialogTitle>
          <DialogDescription>
            {note ? 'Make changes to your note.' : 'Add a new note to your collection.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-grow overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Note title" {...field} className="text-base" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="metadata"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metadata</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Capo 2, Standard Tuning" {...field} className="min-h-[60px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Type your notes and chords here..." {...field} className="min-h-[200px] text-base" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormItem>
                  <FormLabel>Artists</FormLabel>
                  <div className="flex items-center flex-wrap gap-2">
                      {currentArtists.map(artist => (
                          <Badge key={artist} variant="secondary" className="text-sm font-normal pr-1">
                              {artist}
                              <button type="button" onClick={() => handleRemoveArtist(artist)} className="ml-1 rounded-full hover:bg-destructive/20 p-0.5">
                                  <X className="h-3 w-3" />
                              </button>
                          </Badge>
                      ))}
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button type="button" variant="outline" size="sm" className="h-7">
                                  <PlusCircle className="mr-1 h-4 w-4" /> Add Artist
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[200px] p-0">
                              <Command>
                                  <CommandInput 
                                      placeholder="Search or create artist..."
                                      value={artistInput}
                                      onValueChange={setArtistInput}
                                      onKeyDown={(e) => {
                                          if(e.key === 'Enter' && artistInput) {
                                              e.preventDefault();
                                              handleAddArtist(artistInput);
                                          }
                                      }}
                                  />
                                  <CommandList>
                                      <CommandEmpty>No artists found. Press Enter to create.</CommandEmpty>
                                      <CommandGroup>
                                          {allArtists.filter(artist => !currentArtists.includes(artist) && artist.toLowerCase().includes(artistInput.toLowerCase())).map(artist => (
                                              <CommandItem key={artist} onSelect={() => handleAddArtist(artist)}>
                                                  {artist}
                                              </CommandItem>
                                          ))}
                                      </CommandGroup>
                                  </CommandList>
                              </Command>
                          </PopoverContent>
                      </Popover>
                  </div>
              </FormItem>

              <FormField
                control={form.control}
                name="album"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Album</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                        "w-full justify-between font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                >
                                    {field.value || "Select or create album"}
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput 
                                    placeholder="Search or create album..."
                                    value={albumInput}
                                    onValueChange={setAlbumInput}
                                    onKeyDown={(e) => {
                                        if(e.key === 'Enter' && albumInput) {
                                            e.preventDefault();
                                            setValue('album', albumInput);
                                        }
                                    }}
                                />
                                <CommandList>
                                    <CommandEmpty>No album found. Press Enter to create.</CommandEmpty>
                                    <CommandGroup>
                                        {allAlbums.filter(album => album.toLowerCase().includes(albumInput.toLowerCase())).map(album => (
                                            <CommandItem
                                                key={album}
                                                value={album}
                                                onSelect={() => {
                                                    setValue("album", album);
                                                    setAlbumInput(album);
                                                }}
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", album === field.value ? "opacity-100" : "opacity-0")}/>
                                                {album}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="references"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>References</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., https://www.ultimate-guitar.com/..." {...field} className="min-h-[60px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormItem>
                <FormLabel>Tags</FormLabel>
                 <div className="flex items-center flex-wrap gap-2">
                    {currentTags.map(tagId => {
                        const tag = allTags.find(t => t.id === tagId) || {id: tagId, name: tagId};
                        return (
                            <Badge key={tag.id} variant="secondary" className="text-sm font-normal pr-1">
                                {tag.name}
                                <button type="button" onClick={() => handleRemoveTag(tag.id)} className="ml-1 rounded-full hover:bg-destructive/20 p-0.5">
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )
                    })}
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button type="button" variant="outline" size="sm" className="h-7">
                                <PlusCircle className="mr-1 h-4 w-4" /> Add Tag
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0">
                            <Command>
                                <CommandInput placeholder="Search or create tag..." onKeyDown={(e) => {
                                    if(e.key === 'Enter' && e.currentTarget.value) {
                                        e.preventDefault();
                                        handleCreateTag(e.currentTarget.value);
                                    }
                                }}/>
                                <CommandList>
                                    <CommandEmpty>No tags found. Press Enter to create.</CommandEmpty>
                                    <CommandGroup>
                                        {allTags.filter(t => !currentTags.includes(t.id)).map(tag => (
                                            <CommandItem key={tag.id} onSelect={() => handleAddTag(tag.id)}>
                                                {tag.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            </FormItem>
          </form>
        </Form>
        <DialogFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="note-editor-form" onClick={form.handleSubmit(onSubmit)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
