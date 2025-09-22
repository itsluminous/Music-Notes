"use client";

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormLabel } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { PlusCircle, X } from 'lucide-react';
import type { Tag } from '@/lib/types';

interface TagsFieldProps {
  allTags: Tag[];
}

export function TagsField({ allTags }: TagsFieldProps) {
  const { watch, setValue } = useFormContext();
  const currentTags = watch('tags') || [];

  const handleAddTag = (tagId: string) => {
    if (!currentTags.includes(tagId)) {
      setValue('tags', [...currentTags, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setValue('tags', currentTags.filter((id: string) => id !== tagId));
  };

  const handleCreateTag = (tagName: string) => {
    const newTagId = tagName.toLowerCase().replace(/\s+/g, '-');
    if (!allTags.some(t => t.id === newTagId) && !currentTags.includes(newTagId)) {
      setValue('tags', [...currentTags, newTagId]);
    } else if (allTags.some(t => t.id === newTagId) && !currentTags.includes(newTagId)) {
      handleAddTag(newTagId);
    }
  };

  return (
    <div>
      <FormLabel>Tags</FormLabel>
      <div className="flex items-center flex-wrap gap-2 mt-2">
        {currentTags.map((tagId: string) => {
          const tag = allTags.find(t => t.id === tagId) || { id: tagId, name: tagId };
          return (
            <Badge key={tag.id} variant="secondary" className="text-sm font-normal pr-1">
              {tag.name}
              <button type="button" onClick={() => handleRemoveTag(tag.id)} className="ml-1 rounded-full hover:bg-destructive/20 p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-7">
              <PlusCircle className="mr-1 h-4 w-4" /> Add Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput
                placeholder="Search or create tag..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    e.preventDefault();
                    handleCreateTag(e.currentTarget.value);
                  }
                }}
              />
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
    </div>
  );
}
