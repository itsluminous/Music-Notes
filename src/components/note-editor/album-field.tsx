"use client";

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlbumFieldProps {
  allAlbums: string[];
  albumInput: string;
  setAlbumInput: (album: string) => void;
}

export function AlbumField({ allAlbums, albumInput, setAlbumInput }: AlbumFieldProps) {
  const { control, setValue } = useFormContext();

  return (
    <FormField
      control={control}
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
                    if (e.key === 'Enter' && albumInput) {
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
                        <Check className={cn("mr-2 h-4 w-4", album === field.value ? "opacity-100" : "opacity-0")} />
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
  );
}
