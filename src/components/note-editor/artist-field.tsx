"use client";

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormLabel } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { PlusCircle, X } from 'lucide-react';

interface ArtistFieldProps {
  allArtists: string[];
}

export function ArtistField({ allArtists }: ArtistFieldProps) {
  const { watch, setValue } = useFormContext();
  const currentArtists = watch('artist')?.split(',').map((a: string) => a.trim()).filter(Boolean) || [];
  const [artistInput, setArtistInput] = React.useState('');

  const handleAddArtist = (artistName: string) => {
    if (artistName && !currentArtists.includes(artistName)) {
      setValue('artist', [...currentArtists, artistName].join(', '));
    }
    setArtistInput('');
  };

  const handleRemoveArtist = (artistName: string) => {
    setValue('artist', currentArtists.filter((name: string) => name !== artistName).join(', '));
  };

  return (
    <div className="md:col-span-2">
      <FormLabel>Artists</FormLabel>
      <div className="flex items-center flex-wrap gap-2 mt-2">
        {currentArtists.map((artist: string) => (
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
                  if (e.key === 'Enter' && artistInput) {
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
    </div>
  );
}
