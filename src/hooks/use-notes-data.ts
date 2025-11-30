"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Note, Tag } from '@/lib/types';
import { useToast } from './use-toast';
import { handlePotentialAccountRemoval } from '@/lib/account-removal-handler';

// Helper function to fetch all records with pagination
const fetchAllPaginated = async (table: string, user_id: string) => {
  const PAGE_SIZE = 900;
  let allData: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', user_id)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      // Re-throw the error to be caught by the caller
      throw error;
    }

    if (data) {
      allData = [...allData, ...data];
    }

    // If we get less than PAGE_SIZE, we're on the last page.
    if (!data || data.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      page++;
    }
  }
  return allData;
};

// Helper function to fetch all notes without user filtering (public access)
const fetchAllNotesPaginated = async () => {
  const PAGE_SIZE = 900;
  let allData: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    // Fetch notes first
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    if (data) {
      allData = [...allData, ...data];
    }

    if (!data || data.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      page++;
    }
  }
  
  // Fetch author names and emails separately for all notes that have an author
  const authorIds = [...new Set(allData.filter(note => note.author).map(note => note.author))];
  
  if (authorIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, email, name')
      .in('id', authorIds);
    
    if (!profilesError && profiles) {
      // Create maps of author id to email and name
      const authorEmailMap = new Map(profiles.map(p => [p.id, p.email]));
      const authorNameMap = new Map(profiles.map(p => [p.id, p.name]));
      
      // Add author_email and author_name to each note
      allData = allData.map(note => ({
        ...note,
        author_email: note.author ? authorEmailMap.get(note.author) : null,
        author_name: note.author ? authorNameMap.get(note.author) : null
      }));
    }
  }
  
  return allData;
};

// Helper function to fetch all tags with pagination (public access)
const fetchAllTagsPaginated = async () => {
  const PAGE_SIZE = 900;
  let allData: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    if (data) {
      allData = [...allData, ...data];
    }

    if (!data || data.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      page++;
    }
  }
  
  return allData;
};

// Helper function to fetch all note_tags with pagination (public access)
const fetchAllNoteTagsPaginated = async () => {
  const PAGE_SIZE = 900;
  let allData: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('note_tags')
      .select('*')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    if (data) {
      allData = [...allData, ...data];
    }

    if (!data || data.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      page++;
    }
  }
  
  return allData;
};


export function useNotesData() {
	const [notes, setNotes] = useState<Note[]>([]);
	const [tags, setTags] = useState<Tag[]>([]);
	const [loading, setLoading] = useState(true);
	const { toast } = useToast();

	const fetchNotesAndTags = useCallback(async () => {
		setLoading(true);
		try {
			const { data: { user } } = await supabase.auth.getUser();
			
			// Fetch all notes regardless of authentication (public read access)
			const notesData = await fetchAllNotesPaginated();

			// Fetch all tags and note_tags with pagination (public read access enabled)
			// Anonymous users can now view tags on notes
			const tagsData = await fetchAllTagsPaginated();
			const noteTagsData = await fetchAllNoteTagsPaginated();

			const notesWithTags = (notesData || []).map((note: any) => {
				const noteTags = (noteTagsData || []).filter((nt: any) => nt.note_id === note.id);
				const tagIds = noteTags.map((nt: any) => nt.tag_id);
				// Keep DB snake_case timestamps as-is for frontend to use
				const created_at = note.created_at;
				const updated_at = note.updated_at;
				// Author email is already added in fetchAllNotesPaginated
				const author_email = note.author_email || null;
				return { ...note, tags: tagIds, created_at, updated_at, author_email } as Note;
			});

			setNotes(notesWithTags);
			setTags(tagsData || []);
		} catch (error: any) {
            toast({ title: 'Error fetching data', description: error.message, variant: 'destructive' });
			console.error('Failed to fetch notes/tags:', error);
			setNotes([]);
			setTags([]);
		} finally {
			setLoading(false);
		}
	}, [toast]);

	useEffect(() => {
		fetchNotesAndTags();
	}, [fetchNotesAndTags]);

	const saveNote = useCallback(async (savedNote: Note, editingNote: Note | null) => {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) {
				toast({ title: 'Error', description: 'You must be logged in to save a note.', variant: 'destructive' });
				return false;
			}

			let noteId = savedNote.id;

			// Prepare payload for DB: convert camelCase fields to snake_case so Postgres columns match
			const now = new Date().toISOString();
			const toDbPayload: Record<string, any> = {
				title: savedNote.title,
				content: savedNote.content,
				artist: savedNote.artist,
				composer: savedNote.composer,
				album: savedNote.album,
				metadata: savedNote.metadata,
				references: savedNote.references,
				user_id: user.id,
				author: user.id, // Set author to current user ID
			};

			if (editingNote) {
				// Preserve original created timestamp if present
				const originalCreatedAt = (savedNote as any).created_at || savedNote.created_at;
				if (originalCreatedAt) toDbPayload.created_at = originalCreatedAt;
				toDbPayload.updated_at = now;

				const { data, error } = await supabase
					.from('notes')
					.update(toDbPayload)
					.eq('id', editingNote.id)
					.select()
					.single();
				if (error) {
					// Check if user profile was deleted (RLS policy violation)
					await handlePotentialAccountRemoval(user.id, error);
					toast({ title: 'Error updating note', description: error.message, variant: 'destructive' });
					return false;
				}
				noteId = data.id;
			} else {
				// For new inserts, set created_at if provided, otherwise DB default will apply
				const providedCreatedAt = (savedNote as any).created_at || savedNote.created_at;
				if (providedCreatedAt) toDbPayload.created_at = providedCreatedAt;
				toDbPayload.updated_at = now;

				const { data, error } = await supabase
					.from('notes')
					.insert(toDbPayload)
					.select()
					.single();
				if (error) {
					// Check if user profile was deleted (RLS policy violation)
					await handlePotentialAccountRemoval(user.id, error);
					toast({ title: 'Error creating note', description: error.message, variant: 'destructive' });
					return false;
				}
				noteId = data.id;
			}

			// Create new tags if any
			const incomingTags: string[] = savedNote.tags || [];
			// Tags that are neither an existing id nor existing name need creation
			const tagsToCreate = incomingTags.filter(t => !tags.some(existing => existing.id === t) && !tags.some(existing => existing.name === t));

			let createdTags: Tag[] = [];
			if (tagsToCreate.length > 0) {
				const toInsert = tagsToCreate.map(name => ({ name, user_id: user.id }));
				const { data: newTags, error } = await supabase.from('tags').insert(toInsert).select();
				if (error) {
					toast({ title: 'Error creating tags', description: error.message, variant: 'destructive' });
					return false;
				}
				createdTags = newTags || [];
				setTags(prev => [...prev, ...createdTags]);
			}

			// Build the final list of tag ids to associate
			const tagIdsToAssociate: string[] = incomingTags.map(t => {
				const byId = tags.find(tag => tag.id === t);
				if (byId) return byId.id;
				const byName = tags.find(tag => tag.name === t);
				if (byName) return byName.id;
				const created = createdTags.find(ct => ct.name === t);
				if (created) return created.id;
				// as a last resort return t (maybe it's already an id)
				return t;
			});

			// Replace associations
			if (editingNote) {
				await supabase.from('note_tags').delete().eq('note_id', noteId);
			}

			const noteTagsToInsert = tagIdsToAssociate.map(tagId => ({ note_id: noteId, tag_id: tagId, user_id: user.id }));
			if (noteTagsToInsert.length > 0) {
				const { error: noteTagsError } = await supabase.from('note_tags').insert(noteTagsToInsert);
				if (noteTagsError) {
					toast({ title: 'Error associating tags with note', description: noteTagsError.message, variant: 'destructive' });
					return false;
				}
			}

			// Refresh notes in local state
			await fetchNotesAndTags();
			return true;
		} catch (error) {
			console.error('Error saving note:', error);
			toast({ title: 'Error', description: 'Failed to save note.', variant: 'destructive' });
			return false;
		}
	}, [fetchNotesAndTags, tags, toast]);

	return { notes, tags, loading, fetchNotesAndTags, saveNote };
}
