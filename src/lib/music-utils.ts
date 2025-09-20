import React from 'react';

const notesSharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const notesFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const CHORD_REGEX = /(\[.+?\]|\(.+?\))/g;
const CODE_BLOCK_REGEX = /```([\s\S]*?)```/g;
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

type LinkPart = { type: 'link'; href: string; text: string };
type TextPart = { type: 'text'; text: string };
type ContentPart = LinkPart | TextPart;

export function isLinkPart(part: ContentPart): part is LinkPart {
  return part.type === 'link';
}

const getNoteIndex = (note: string) => {
  const sharpIndex = notesSharp.indexOf(note);
  if (sharpIndex !== -1) return sharpIndex;
  return notesFlat.indexOf(note);
};

const getTransposedNote = (note: string, steps: number) => {
  const noteRoot = note.match(/^[A-G](?:#|b)?/)?.[0];
  if (!noteRoot) return note;

  const restOfChord = note.substring(noteRoot.length);
  const noteIndex = getNoteIndex(noteRoot);

  if (noteIndex === -1) return note;

  const newIndex = (noteIndex + steps + 12) % 12;
  const transposedNote = notesSharp[newIndex];
  
  return transposedNote + restOfChord;
};

const sharpNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const flatNotes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const allNotes = [...new Set([...sharpNotes, ...flatNotes])];
const chordQualities = [
  // Major
  '', 'M', 'maj', 'major',
  // Minor
  'm', 'min', 'minor',
  // Seventh
  '7', 'maj7', 'M7', 'm7', 'min7', 'dim7', '°7',
  // Augmented
  'aug', '+',
  // Diminished
  'dim', '°',
  // Power Chords
  '5',
  // Suspended
  'sus', 'sus2', 'sus4',
  // Added
  'add2', 'add9',
  // Others
  '6', 'm6', '9', 'm9', '11', 'm11', '13', 'm13'
];
const validChords = new Set<string>();
allNotes.forEach(note => {
  chordQualities.forEach(quality => {
    validChords.add(note + quality);
    // Handle chords with bass notes like G/B
    allNotes.forEach(bassNote => {
      validChords.add(`${note}${quality}/${bassNote}`);
    })
  });
});

function isChord(str: string): boolean {
  return validChords.has(str);
}


export const transpose = (chord: string, steps: number): string => {
  if (steps === 0) return chord;
  const chordContent = chord.slice(1, -1);
  const [mainChord, bassNote] = chordContent.split('/');
  
  const transposedMainChord = getTransposedNote(mainChord, steps);

  if(bassNote) {
    const transposedBassNote = getTransposedNote(bassNote, steps);
    return `(${transposedMainChord}/${transposedBassNote})`;
  }
  
  return `(${transposedMainChord})`;
};

const renderTextWithChords = (text: string, transposeSteps: number = 0, keyPrefix: string) => {
  const parts = text.split(CHORD_REGEX);
  
  return parts.map((part, index) => {
    const chordContent = part.slice(1, -1);
    if ((part.startsWith('(') || part.startsWith('[')) && isChord(chordContent)) {
      const transposedChord = transpose(part, transposeSteps);
      return React.createElement(
        'span',
        {
          key: `${keyPrefix}-${index}`,
          className:
            'font-bold text-accent-foreground bg-accent/80 rounded py-0.5',
        },
        transposedChord
      );
    }
    return part;
  });
}

export const highlightChordsAndCode = (text: string, transposeSteps: number = 0) => {
  if (!text) return [];

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = CODE_BLOCK_REGEX.exec(text)) !== null) {
    // Text before the code block
    if (match.index > lastIndex) {
      const plainText = text.substring(lastIndex, match.index);
      elements.push(...renderTextWithChords(plainText, transposeSteps, `text-${lastIndex}`));
    }
    
    // The code block
    const codeContent = match[1];
    elements.push(
      React.createElement(
        'pre',
        {
          key: `code-${match.index}`,
          className: 'bg-muted/50 p-2 rounded-md my-2 overflow-x-auto font-code text-sm whitespace-pre',
        },
        React.createElement('code', null, codeContent)
      )
    );
    
    lastIndex = match.index + match[0].length;
  }

  // Text after the last code block
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    elements.push(...renderTextWithChords(remainingText, transposeSteps, `text-${lastIndex}`));
  }

  return elements;
};

export const linkify = (text: string): ContentPart[] => {
  if (!text) return [];
  const parts = text.split(URL_REGEX);

  return parts
    .map((part) => {
      if (part.match(URL_REGEX)) {
        const linkPart: LinkPart = { type: 'link', href: part, text: part };
        return linkPart;
      }
      const textPart: TextPart = { type: 'text', text: part };
      return textPart;
    })
    .filter((part) => part.text.length > 0);
};


/**
 * Parses a metadata string to find a capo value.
 * @param metadata The metadata string from a note.
 * @returns The capo value as a number, or 0 if not found.
 */
export const parseCapoValue = (metadata: string | undefined): number => {
  if (!metadata) {
    return 0;
  }

  const lines = metadata.split('\n');
  const capoLine = lines.find(line => line.trim().toLowerCase().startsWith('capo'));

  if (capoLine) {
    // Match the first sequence of digits in the line
    const match = capoLine.match(/\d+/);
    if (match) {
      return parseInt(match[0], 10);
    }
  }

  return 0;
};
