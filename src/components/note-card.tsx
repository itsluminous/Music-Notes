"use client";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Note, Tag } from '@/lib/types';
import { highlightChordsAndCode } from '@/lib/music-utils';

interface NoteCardProps {
  note: Note;
  allTags: Tag[];
  onCardClick: () => void;
}

function truncateContent(content: string, maxLength = 150) {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength) + '...';
}

export function NoteCard({ note, allTags, onCardClick }: NoteCardProps) {
  const noteTags = note.tags.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) as Tag[];

  return (
    <Card 
      className="flex flex-col h-full cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onCardClick}
    >
      <CardHeader>
        <CardTitle className="font-headline text-lg">{note.title}</CardTitle>
        {note.artist && (
          <div className="text-sm text-muted-foreground">{note.artist}</div>
        )}
        {note.composer && (
          <div className="text-sm text-muted-foreground italic">Composer: {note.composer}</div>
        )}
      </CardHeader>
      <CardContent className="flex-grow text-sm">
        <div className="line-clamp-6 whitespace-pre-wrap">
          {highlightChordsAndCode(truncateContent(note.content))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 pt-4">
        {noteTags.length > 0 ? (
          noteTags.map(tag => (
            <Badge key={tag.id} variant="secondary" className="font-normal">
              {tag.name}
            </Badge>
          ))
        ) : (
          <Badge variant="outline" className="font-normal">
            Untagged
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}
