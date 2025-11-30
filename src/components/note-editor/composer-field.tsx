"use client";

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComposerFieldProps {
  allComposers: string[];
}

export function ComposerField({ allComposers }: ComposerFieldProps) {
  const { control, setValue } = useFormContext();
  const [composerInput, setComposerInput] = React.useState('');

  return (
    <FormField
      control={control}
      name="composer"
      render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel>Composer</FormLabel>
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
                  {field.value || "Select or create composer"}
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput
                  placeholder="Search or create composer..."
                  value={composerInput}
                  onValueChange={setComposerInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && composerInput) {
                      e.preventDefault();
                      setValue('composer', composerInput);
                      setComposerInput('');
                    }
                  }}
                />
                <CommandList>
                  <CommandEmpty>No composer found. Press Enter to create.</CommandEmpty>
                  <CommandGroup>
                    {allComposers
                      .filter(composer => composer.toLowerCase().includes(composerInput.toLowerCase()))
                      .map(composer => (
                        <CommandItem
                          key={composer}
                          value={composer}
                          onSelect={() => {
                            setValue("composer", composer);
                            setComposerInput('');
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", composer === field.value ? "opacity-100" : "opacity-0")} />
                          {composer}
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
