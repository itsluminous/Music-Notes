import type { Note, Tag, ExportData, ExportNote } from './types';
import { supabase } from './supabase';
import { handlePotentialAccountRemoval } from './account-removal-handler';

/**
 * Export notes to JSON format with all metadata
 * Converts tag IDs to tag names and includes author email
 */
export function exportNotes(notes: Note[], tags: Tag[]): ExportData {
  const exportNotes: ExportNote[] = notes.map(note => {
    // Convert tag IDs to tag names
    const tagNames = note.tags
      .map(tagId => tags.find(t => t.id === tagId)?.name)
      .filter((name): name is string => Boolean(name));

    return {
      title: note.title,
      content: note.content,
      artist: note.artist,
      album: note.album,
      release_year: note.release_year,
      metadata: note.metadata,
      references: note.references,
      is_pinned: note.is_pinned,
      tags: tagNames,
      author: note.author_email || note.author, // Use email if available, fallback to ID
      created_at: note.created_at,
      updated_at: note.updated_at,
    };
  });

  return {
    version: '1.0',
    exported_at: new Date().toISOString(),
    notes: exportNotes,
  };
}

/**
 * Trigger download of export data as JSON file
 */
export function downloadExportData(exportData: ExportData): void {
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
    type: 'application/json' 
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `music-notes-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate import file structure and required fields
 */
function validateImportData(data: any): data is ExportData {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid file format: not a valid JSON object');
  }

  if (!data.version || typeof data.version !== 'string') {
    throw new Error('Invalid file format: missing or invalid version field');
  }

  if (!data.notes || !Array.isArray(data.notes)) {
    throw new Error('Invalid file format: missing or invalid notes array');
  }

  // Validate each note has required fields
  for (let i = 0; i < data.notes.length; i++) {
    const note = data.notes[i];
    if (!note.title || typeof note.title !== 'string') {
      throw new Error(`Invalid note at index ${i}: missing or invalid title`);
    }
    if (!note.content || typeof note.content !== 'string') {
      throw new Error(`Invalid note at index ${i}: missing or invalid content`);
    }
    if (!note.created_at || typeof note.created_at !== 'string') {
      throw new Error(`Invalid note at index ${i}: missing or invalid created_at`);
    }
    if (!Array.isArray(note.tags)) {
      throw new Error(`Invalid note at index ${i}: tags must be an array`);
    }
  }

  return true;
}

/**
 * Import notes from JSON file
 * Creates or matches tags by name, creates notes with current user as author
 * Preserves original timestamps if provided
 */
export async function importNotes(file: File): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('You must be logged in to import notes');
    }

    // Parse file
    const text = await file.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('Invalid JSON file');
    }

    // Validate structure
    validateImportData(data);

    // Fetch existing tags
    const { data: existingTags, error: tagsError } = await supabase
      .from('tags')
      .select('id, name');
    
    if (tagsError) {
      throw new Error(`Failed to fetch tags: ${tagsError.message}`);
    }

    const tagMap = new Map<string, string>();
    (existingTags || []).forEach(tag => {
      tagMap.set(tag.name.toLowerCase(), tag.id);
    });

    // Process each note
    const notesToInsert: any[] = [];
    const newTags = new Set<string>();

    for (const exportNote of data.notes) {
      // Collect unique new tags
      for (const tagName of exportNote.tags) {
        if (!tagMap.has(tagName.toLowerCase())) {
          newTags.add(tagName);
        }
      }
    }

    // Create new tags if needed
    if (newTags.size > 0) {
      const tagsToCreate = Array.from(newTags).map(name => ({ name, user_id: user.id }));
      const { data: createdTags, error: createTagsError } = await supabase
        .from('tags')
        .insert(tagsToCreate)
        .select('id, name');

      if (createTagsError) {
        await handlePotentialAccountRemoval(user.id, createTagsError);
        throw new Error(`Failed to create tags: ${createTagsError.message}`);
      }

      // Update tag map with newly created tags
      (createdTags || []).forEach(tag => {
        tagMap.set(tag.name.toLowerCase(), tag.id);
      });
    }

    // Prepare notes for insertion
    for (const exportNote of data.notes) {
      // Map tag names to IDs
      const tagIds = exportNote.tags
        .map((name: string) => tagMap.get(name.toLowerCase()))
        .filter((id: string | undefined): id is string => Boolean(id));

      const noteToInsert: any = {
        title: exportNote.title,
        content: exportNote.content,
        artist: exportNote.artist,
        album: exportNote.album,
        release_year: exportNote.release_year,
        metadata: exportNote.metadata,
        references: exportNote.references,
        is_pinned: exportNote.is_pinned || false,
        tags: tagIds,
        author: user.id,
        user_id: user.id,
      };

      // Preserve original timestamps if provided
      if (exportNote.created_at) {
        noteToInsert.created_at = exportNote.created_at;
      }
      if (exportNote.updated_at) {
        noteToInsert.updated_at = exportNote.updated_at;
      }

      notesToInsert.push(noteToInsert);
    }

    // Insert all notes
    const { error: insertError } = await supabase
      .from('notes')
      .insert(notesToInsert);

    if (insertError) {
      await handlePotentialAccountRemoval(user.id, insertError);
      throw new Error(`Failed to insert notes: ${insertError.message}`);
    }

    return {
      success: true,
      count: notesToInsert.length,
    };
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
