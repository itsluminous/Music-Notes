'use server';

import { enrichNoteMetadata, EnrichNoteMetadataInput } from '@/ai/flows/enrich-note-metadata';

export async function getNoteSuggestions(noteContent: string, userInput: string) {
  try {
    const input: EnrichNoteMetadataInput = { noteContent, userInput };
    const result = await enrichNoteMetadata(input);
    return result;
  } catch (error) {
    console.error('Error enriching note metadata:', error);
    // In a real app, you might want to return a more specific error object
    return { error: 'Failed to get suggestions.' };
  }
}
