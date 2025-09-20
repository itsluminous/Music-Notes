'use server';

/**
 * @fileOverview This file defines a Genkit flow for enriching note metadata with album and artist information.
 *
 * The flow takes note content as input, analyzes it using an LLM, and suggests relevant album and artist metadata.
 * It exports:
 *   - enrichNoteMetadata: The main function to trigger the flow.
 *   - EnrichNoteMetadataInput: The input type for the enrichNoteMetadata function.
 *   - EnrichNoteMetadataOutput: The output type for the enrichNoteMetadata function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema for the flow
const EnrichNoteMetadataInputSchema = z.object({
  noteContent: z.string().describe('The content of the note to enrich.'),
  userInput: z.string().optional().describe('Any user input to help with the enrichment.'),
});
export type EnrichNoteMetadataInput = z.infer<typeof EnrichNoteMetadataInputSchema>;

// Define the output schema for the flow
const EnrichNoteMetadataOutputSchema = z.object({
  artist: z.string().describe('The suggested artist for the note.'),
  album: z.string().describe('The suggested album for the note.'),
});
export type EnrichNoteMetadataOutput = z.infer<typeof EnrichNoteMetadataOutputSchema>;

// Define the tool to get album and artist information
const getAlbumAndArtistInfo = ai.defineTool({
  name: 'getAlbumAndArtistInfo',
  description: 'Retrieves album and artist information based on the note content and user input.',
  inputSchema: z.object({
    noteContent: z.string().describe('The content of the note.'),
    userInput: z.string().optional().describe('Optional user input to help find the correct album and artist.'),
  }),
  outputSchema: z.object({
    artist: z.string().describe('The artist of the note.'),
    album: z.string().describe('The album of the note.'),
  }),
}, async (input) => {
  // Placeholder implementation for fetching album and artist info.
  // Replace this with actual API calls or database lookups.
  console.log(`Fetching album and artist info for note content: ${input.noteContent} and user input: ${input.userInput}`);
  return {
    artist: 'Unknown Artist',
    album: 'Unknown Album',
  };
});

// Define the prompt for enriching the note metadata
const enrichNoteMetadataPrompt = ai.definePrompt({
  name: 'enrichNoteMetadataPrompt',
  tools: [getAlbumAndArtistInfo],
  input: {schema: EnrichNoteMetadataInputSchema},
  output: {schema: EnrichNoteMetadataOutputSchema},
  prompt: `Based on the content of the note below, and any user input, suggest the most relevant artist and album.

Note Content:
{{noteContent}}

User Input:
{{userInput}}

Use the getAlbumAndArtistInfo tool to retrieve the artist and album information.

Return the artist and album in the output schema.
`,
});

// Define the Genkit flow
const enrichNoteMetadataFlow = ai.defineFlow(
  {
    name: 'enrichNoteMetadataFlow',
    inputSchema: EnrichNoteMetadataInputSchema,
    outputSchema: EnrichNoteMetadataOutputSchema,
  },
  async input => {
    const {output} = await enrichNoteMetadataPrompt(input);
    return output!;
  }
);

/**
 * Enriches note metadata with album and artist information.
 * @param input The input containing the note content and user input.
 * @returns The enriched metadata containing the suggested artist and album.
 */
export async function enrichNoteMetadata(input: EnrichNoteMetadataInput): Promise<EnrichNoteMetadataOutput> {
  return enrichNoteMetadataFlow(input);
}
