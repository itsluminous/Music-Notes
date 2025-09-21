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
  release_year: z.string().optional(),
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
  const [fetchingMB, setFetchingMB] = React.useState(false);

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: '',
      content: '',
      artist: '',
      album: '',
      release_year: '',
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
        release_year: note.release_year ? String(note.release_year) : '',
        metadata: note.metadata || '',
        references: note.references || '',
        tags: note.tags || [],
      });
      setAlbumInput(note.album || '');
    } else {
      form.reset({ title: '', content: '', artist: '', album: '', release_year: '', metadata: '', references: '', tags: [] });
      setAlbumInput('');
    }
  }, [note, form, isOpen]);

  
  const onSubmit = (data: NoteFormData) => {
    const now = new Date().toISOString();
    // Prefer existing created_at if present
    const existingCreatedAt = (note as any)?.created_at || now;

    // Use snake_case timestamps throughout
    const finalNote: any = {
      id: note?.id || new Date().toISOString(),
      created_at: existingCreatedAt,
      updated_at: now,
      ...data,
      artist: currentArtists.join(', '),
      release_year: data.release_year ? parseInt(data.release_year) : undefined,
      tags: data.tags || [],
    };
    onSave(finalNote as any);
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
          <form id="note-editor-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-grow overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Note title"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          const v = e.currentTarget.value;
                          if (v && v.trim().length > 0) {
                            form.clearErrors('title');
                          }
                        }}
                        className="text-base"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const title = form.getValues('title')?.trim();
                          if (!title) {
                            form.setError('title', { type: 'manual', message: 'Title is required' });
                            return;
                          }
                          setFetchingMB(true);
                          try {
                            const params = new URLSearchParams({ query: title, fmt: 'json' });
                            const resp = await fetch(`https://musicbrainz.org/ws/2/recording/?${params.toString()}`, {
                              headers: { 'User-Agent': 'KeepNotesToSupabase/1.0 ( your_email@example.com )' },
                            });
                            if (!resp.ok) throw new Error(`MusicBrainz returned ${resp.status}`);
                            const data = await resp.json();
                            const rec = data.recordings && data.recordings[0];
                            if (rec) {
                              const artist = rec['artist-credit']?.[0]?.name || '';
                              const album = rec.releases?.[0]?.title || '';
                              const date = rec.releases?.[0]?.date || '';
                              const year = date ? String(date).split('-')[0] : '';
                              setValue('artist', artist);
                              setValue('album', album);
                              setValue('release_year', year);
                              setAlbumInput(album);
                            }
                          } catch (e) {
                            console.error('MusicBrainz fetch failed', e);
                          } finally {
                            setFetchingMB(false);
                          }
                        }}
                        disabled={fetchingMB}
                      >
                        {fetchingMB ? 'Fetching…' : '✨ Fetch'}
                      </Button>
                    </div>
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
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <FormItem className="md:col-span-2">
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
                  <FormItem className="md:col-span-3">
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

              <FormField
                control={form.control}
                name="release_year"
                render={({ field }) => (
                  <FormItem className="md:col-span-1">
                    <FormLabel>Release Year</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 1998" {...field} className="text-base" />
                    </FormControl>
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
