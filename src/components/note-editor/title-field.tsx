"use client";

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fetchMusicBrainzData } from '@/lib/music-utils';

interface TitleFieldProps {
  isFetching: boolean;
  setIsFetching: (isFetching: boolean) => void;
  setAlbumInput: (album: string) => void;
}

export function TitleField({ isFetching, setIsFetching, setAlbumInput }: TitleFieldProps) {
  const form = useFormContext();

  const handleFetch = async () => {
    const title = form.getValues('title')?.trim();
    if (!title) {
      form.setError('title', { type: 'manual', message: 'Title is required' });
      return;
    }
    setIsFetching(true);
    try {
      const musicData = await fetchMusicBrainzData(title);
      if (musicData) {
        form.setValue('artist', musicData.artist);
        form.setValue('album', musicData.album);
        form.setValue('release_year', musicData.year);
        setAlbumInput(musicData.album);
      }
    } catch (e) {
      console.error('MusicBrainz fetch failed', e);
    } finally {
      setIsFetching(false);
    }
  };

  return (
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
                  if (e.currentTarget.value.trim().length > 0) {
                    form.clearErrors('title');
                  }
                }}
                className="text-base"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFetch}
                disabled={isFetching}
              >
                {isFetching ? 'Fetching…' : '✨ Fetch'}
              </Button>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
