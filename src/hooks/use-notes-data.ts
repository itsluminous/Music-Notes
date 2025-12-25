"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Note, Tag } from '@/lib/types';
import { useToast } from './use-toast';
import { useAuth } from './use-auth';
import { handlePotentialAccountRemoval } from '@/lib/account-removal-handler';
import * as debugLogger from '@/lib/debug-logger';
import * as cacheManager from '@/lib/cache-manager';



// Helper function to fetch all notes without user filtering (public access)
const fetchAllNotesPaginated = async (sinceTimestamp?: string) => {
  const PAGE_SIZE = 900;
  let allData: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    // Fetch notes first
    let query = supabase
      .from('notes')
      .select('*');
    
    // Add incremental filter if sinceTimestamp is provided
    if (sinceTimestamp) {
      query = query.gt('updated_at', sinceTimestamp);
    }
    
    const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

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
  
  // Log incremental fetch if timestamp was provided
  if (sinceTimestamp) {
    debugLogger.logIncrementalFetch(sinceTimestamp, allData.length);
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
// Note: tags table doesn't have updated_at column, so we always fetch all tags
const fetchAllTagsPaginated = async () => {
  const PAGE_SIZE = 900;
  let allData: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const query = supabase
      .from('tags')
      .select('*');
    
    const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

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

// Helper function to fetch note_tags with pagination (public access)
// When modifiedNoteIds is provided, only fetch note_tags for those specific notes
const fetchAllNoteTagsPaginated = async (modifiedNoteIds?: string[]) => {
  const PAGE_SIZE = 900;
  let allData: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('note_tags')
      .select('*');
    
    // Filter by modified note IDs if provided
    if (modifiedNoteIds && modifiedNoteIds.length > 0) {
      query = query.in('note_id', modifiedNoteIds);
    }
    
    const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

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
	const { toast } = useToast();
	const { user } = useAuth();
	const [notes, setNotes] = useState<Note[]>([]);
	const [tags, setTags] = useState<Tag[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingFromCache, setLoadingFromCache] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	
	const MAX_RETRY_ATTEMPTS = 3;
	const RETRY_DELAY_MS = 2000;

	// Helper: Check if localStorage is available
	const checkLocalStorageAvailability = (): boolean => {
		try {
			localStorage.setItem('__test__', 'test');
			localStorage.removeItem('__test__');
			return true;
		} catch (e) {
			debugLogger.logError('localStorage Check', new Error('localStorage is not available'));
			return false;
		}
	};

	// Helper: Reconstruct notes with their associated tags
	const reconstructNotesWithTags = (notesData: any[], noteTagsData: any[]): Note[] => {
		return notesData.map((note: any) => {
			const noteTags = noteTagsData.filter((nt: any) => nt.note_id === note.id);
			const tagIds = noteTags.map((nt: any) => nt.tag_id);
			return { ...note, tags: tagIds } as Note;
		});
	};

	// Helper: Handle cache write failures
	const handleCacheWriteFailure = (context: string) => {
		debugLogger.logError('Cache Write', new Error(`Failed to write to cache - ${context}`));
		toast({
			title: context === 'full fetch' ? 'Unable to cache data' : 'Cache storage full',
			description: context === 'full fetch' 
				? 'Data loaded successfully but could not be saved locally. You may experience slower load times on next visit.'
				: 'Unable to save updates locally. Data will be fetched fresh on next load.',
			variant: context === 'full fetch' ? 'default' : 'destructive'
		});
	};

	// Helper: Perform incremental fetch with retry logic
	const performIncrementalFetch = useCallback(async (
		cachedData: cacheManager.CachedData,
		attempt: number = 0
	): Promise<void> => {
		setRefreshing(true);
		debugLogger.logIncrementalFetch(cachedData.metadata.lastUpdateTimestamp, 0);
		
		try {
			// Fetch incremental updates for notes only (notes table has updated_at)
			const incrementalNotes = await fetchAllNotesPaginated(cachedData.metadata.lastUpdateTimestamp);
			
			// Fetch ALL tags (tags table doesn't have updated_at column)
			const allTags = await fetchAllTagsPaginated();
			
			// Fetch note_tags only for the modified notes
			const modifiedNoteIds = incrementalNotes.map(note => note.id);
			const incrementalNoteTags = await fetchAllNoteTagsPaginated(modifiedNoteIds);
			
			// Only merge and update if we got new data
			if (incrementalNotes.length > 0 || incrementalNoteTags.length > 0) {
				// Merge with cached data
				const mergedData = cacheManager.mergeNotesData(cachedData, {
					notes: incrementalNotes,
					tags: allTags,
					noteTags: incrementalNoteTags,
				});
				
				// Update cache with merged data
				const cacheWriteSuccess = cacheManager.setCachedData(mergedData);
				
				if (!cacheWriteSuccess) {
					handleCacheWriteFailure('incremental fetch');
				}
				
				// Update UI with merged data
				const mergedNotesWithTags = reconstructNotesWithTags(mergedData.notes, mergedData.noteTags);
				setNotes(mergedNotesWithTags);
				setTags(mergedData.tags);
			}
		} catch (incrementalError: any) {
			// Log error but keep cached data visible
			debugLogger.logError('Incremental Fetch', incrementalError);
			
			// Retry logic
			if (attempt < MAX_RETRY_ATTEMPTS) {
				const nextAttempt = attempt + 1;
				
				toast({
					title: 'Background refresh failed',
					description: `Retrying (${nextAttempt}/${MAX_RETRY_ATTEMPTS})...`,
					variant: 'destructive'
				});
				
				// Wait before retrying
				await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
				
				// Retry
				return performIncrementalFetch(cachedData, nextAttempt);
			} else {
				// Max retries reached
				toast({
					title: 'Background refresh failed',
					description: 'Showing cached data. Will retry on next load.',
					variant: 'destructive'
				});
			}
		} finally {
			setRefreshing(false);
		}
	}, [toast, MAX_RETRY_ATTEMPTS, RETRY_DELAY_MS]);

	// Helper: Load data from cache
	const loadFromCache = useCallback((cachedData: cacheManager.CachedData) => {
		debugLogger.logCacheHit(cachedData.notes.length, cacheManager.getCacheAge(cachedData.metadata));
		setLoadingFromCache(true);
		
		const notesWithTags = reconstructNotesWithTags(cachedData.notes, cachedData.noteTags);
		
		setNotes(notesWithTags);
		setTags(cachedData.tags);
		setLoading(false);
		setLoadingFromCache(false);
		
		// Start background incremental fetch with retry mechanism
		performIncrementalFetch(cachedData);
	}, [performIncrementalFetch]);

	// Helper: Perform full fetch from database
	const performFullFetch = useCallback(async () => {
		const startTime = Date.now();
		
		// Fetch all notes regardless of authentication (public read access)
		const notesData = await fetchAllNotesPaginated();

		// Fetch all tags and note_tags with pagination (public read access enabled)
		const tagsData = await fetchAllTagsPaginated();
		const noteTagsData = await fetchAllNoteTagsPaginated();

		const notesWithTags = reconstructNotesWithTags(notesData || [], noteTagsData || []);

		setNotes(notesWithTags);
		setTags(tagsData || []);
		
		// Cache the fetched data
		const lastUpdateTimestamp = notesData.reduce((latest: string, note: any) => {
			if (!note.updated_at) return latest;
			return note.updated_at > latest ? note.updated_at : latest;
		}, new Date(0).toISOString());
		
		const cacheData: cacheManager.CachedData = {
			notes: notesData,
			tags: tagsData || [],
			noteTags: noteTagsData || [],
			metadata: cacheManager.createCacheMetadata(lastUpdateTimestamp),
		};
		
		const cacheWriteSuccess = cacheManager.setCachedData(cacheData);
		
		if (!cacheWriteSuccess) {
			handleCacheWriteFailure('full fetch');
		}
		
		const duration = Date.now() - startTime;
		debugLogger.logFullFetch(duration, notesData.length);
	}, [toast]);

	const fetchNotesAndTags = useCallback(async (forceFull: boolean = false) => {
		setLoading(true);
		
		try {
			const localStorageAvailable = checkLocalStorageAvailability();
			
			// Check cache first (only if localStorage is available and not forcing full fetch)
			const cachedData = (localStorageAvailable && !forceFull) ? cacheManager.getCachedData() : null;
			
			if (cachedData && cacheManager.isCacheValid(cachedData.metadata)) {
				loadFromCache(cachedData);
			} else {
				// Cache invalid or missing - perform full fetch
				if (cachedData) {
					debugLogger.logCacheInvalidation('Cache expired or invalid');
					cacheManager.clearCache();
				} else {
					debugLogger.logCacheMiss('No cache found');
				}
				
				await performFullFetch();
			}
		} catch (error: any) {
			debugLogger.logError('Fetch Notes and Tags', error);
			toast({ title: 'Error fetching data', description: error.message, variant: 'destructive' });
			console.error('Failed to fetch notes/tags:', error);
			setNotes([]);
			setTags([]);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [toast, loadFromCache, performFullFetch]);

	useEffect(() => {
		fetchNotesAndTags();
	}, [fetchNotesAndTags]);

	// Helper: Prepare note payload for database
	const prepareNotePayload = (savedNote: Note, userId: string, isUpdate: boolean): Record<string, any> => {
		const now = new Date().toISOString();
		const payload: Record<string, any> = {
			title: savedNote.title,
			content: savedNote.content,
			artist: savedNote.artist,
			composer: savedNote.composer,
			album: savedNote.album,
			metadata: savedNote.metadata,
			references: savedNote.references,
			user_id: userId,
			author: userId,
			updated_at: now,
		};

		// Preserve or set created_at timestamp
		const createdAt = (savedNote as any).created_at || savedNote.created_at;
		if (createdAt) {
			payload.created_at = createdAt;
		}

		return payload;
	};

	// Helper: Save or update note in database
	const saveNoteToDb = async (
		savedNote: Note, 
		editingNote: Note | null, 
		userId: string
	): Promise<string | null> => {
		const payload = prepareNotePayload(savedNote, userId, !!editingNote);

		if (editingNote) {
			const { data, error } = await supabase
				.from('notes')
				.update(payload)
				.eq('id', editingNote.id)
				.select()
				.single();
			
			if (error) {
				await handlePotentialAccountRemoval(userId, error);
				toast({ title: 'Error updating note', description: error.message, variant: 'destructive' });
				return null;
			}
			return data.id;
		} else {
			const { data, error } = await supabase
				.from('notes')
				.insert(payload)
				.select()
				.single();
			
			if (error) {
				await handlePotentialAccountRemoval(userId, error);
				toast({ title: 'Error creating note', description: error.message, variant: 'destructive' });
				return null;
			}
			return data.id;
		}
	};

	// Helper: Create new tags that don't exist yet
	const createNewTags = async (incomingTags: string[], userId: string): Promise<Tag[]> => {
		const tagsToCreate = incomingTags.filter(
			t => !tags.some(existing => existing.id === t || existing.name === t)
		);

		if (tagsToCreate.length === 0) return [];

		const toInsert = tagsToCreate.map(name => ({ name, user_id: userId }));
		const { data: newTags, error } = await supabase.from('tags').insert(toInsert).select();
		
		if (error) {
			toast({ title: 'Error creating tags', description: error.message, variant: 'destructive' });
			throw error;
		}

		const createdTags = newTags || [];
		setTags(prev => [...prev, ...createdTags]);
		return createdTags;
	};

	// Helper: Resolve tag names/ids to actual tag ids
	const resolveTagIds = (incomingTags: string[], createdTags: Tag[]): string[] => {
		return incomingTags.map(t => {
			const byId = tags.find(tag => tag.id === t);
			if (byId) return byId.id;
			
			const byName = tags.find(tag => tag.name === t);
			if (byName) return byName.id;
			
			const created = createdTags.find(ct => ct.name === t);
			if (created) return created.id;
			
			return t; // Fallback to original value
		});
	};

	// Helper: Associate tags with a note
	const associateTagsWithNote = async (
		noteId: string, 
		tagIds: string[], 
		userId: string, 
		isUpdate: boolean
	): Promise<boolean> => {
		// Replace associations for updates
		if (isUpdate) {
			await supabase.from('note_tags').delete().eq('note_id', noteId);
		}

		if (tagIds.length === 0) return true;

		const noteTagsToInsert = tagIds.map(tagId => ({ 
			note_id: noteId, 
			tag_id: tagId, 
			user_id: userId 
		}));

		const { error } = await supabase.from('note_tags').insert(noteTagsToInsert);
		
		if (error) {
			toast({ title: 'Error associating tags with note', description: error.message, variant: 'destructive' });
			return false;
		}

		return true;
	};

	const saveNote = useCallback(async (savedNote: Note, editingNote: Note | null) => {
		try {
			if (!user) {
				toast({ title: 'Error', description: 'You must be logged in to save a note.', variant: 'destructive' });
				return false;
			}

			// Save or update the note
			const noteId = await saveNoteToDb(savedNote, editingNote, user.id);
			if (!noteId) return false;

			// Handle tags
			const incomingTags: string[] = savedNote.tags || [];
			const createdTags = await createNewTags(incomingTags, user.id);
			const tagIdsToAssociate = resolveTagIds(incomingTags, createdTags);

			// Associate tags with note
			const success = await associateTagsWithNote(noteId, tagIdsToAssociate, user.id, !!editingNote);
			if (!success) return false;

			// Refresh notes in local state and update cache
			await fetchNotesAndTags();
			return true;
		} catch (error) {
			console.error('Error saving note:', error);
			toast({ title: 'Error', description: 'Failed to save note.', variant: 'destructive' });
			return false;
		}
	}, [fetchNotesAndTags, tags, toast, user]);

	return { notes, tags, loading, loadingFromCache, refreshing, fetchNotesAndTags, saveNote };
}
