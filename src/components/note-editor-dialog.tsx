"use client";

import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
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
import type { Note, Tag } from '@/lib/types';
import { TitleField } from './note-editor/title-field';
import { ArtistField } from './note-editor/artist-field';
import { AlbumField } from './note-editor/album-field';
import { TagsField } from './note-editor/tags-field';

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
  const [albumInput, setAlbumInput] = React.useState('');
  const [fetchingMB, setFetchingMB] = React.useState(false);

  const methods = useForm<NoteFormData>({
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

  React.useEffect(() => {
    if (note) {
      methods.reset({
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
      methods.reset({ title: '', content: '', artist: '', album: '', release_year: '', metadata: '', references: '', tags: [] });
      setAlbumInput('');
    }
  }, [note, methods, isOpen]);

  const onSubmit = (data: NoteFormData) => {
    const now = new Date().toISOString();
    const existingCreatedAt = (note as any)?.created_at || now;

    const finalNote: any = {
      id: note?.id || new Date().toISOString(),
      created_at: existingCreatedAt,
      updated_at: now,
      ...data,
      artist: data.artist,
      release_year: data.release_year ? parseInt(data.release_year) : undefined,
      tags: data.tags || [],
    };
    onSave(finalNote as any);
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
        <FormProvider {...methods}>
          <Form {...methods}>
            <form id="note-editor-form" onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4 flex-grow overflow-y-auto pr-2">
              <TitleField isFetching={fetchingMB} setIsFetching={setFetchingMB} setAlbumInput={setAlbumInput} />
              <FormField
                control={methods.control}
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
                control={methods.control}
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
                <ArtistField allArtists={allArtists} />
                <AlbumField allAlbums={allAlbums} albumInput={albumInput} setAlbumInput={setAlbumInput} />
                <FormField
                  control={methods.control}
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
                control={methods.control}
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
              <TagsField allTags={allTags} />
            </form>
          </Form>
        </FormProvider>
        <DialogFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="note-editor-form" onClick={methods.handleSubmit(onSubmit)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}