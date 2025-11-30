import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportNotes, downloadExportData, importNotes } from './export-utils';
import type { Note, Tag, ExportData } from './types';
import { supabase } from './supabase';

// Mock supabase
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('Export Utils', () => {
  describe('exportNotes', () => {
    it('should export notes with all required fields', () => {
      const notes: Note[] = [
        {
          id: '1',
          title: 'Test Note',
          content: 'Test content',
          artist: 'Test Artist',
          composer: 'Test Composer',
          album: 'Test Album',
          release_year: 2024,
          metadata: 'Test metadata',
          references: 'Test references',
          tags: ['tag1', 'tag2'],
          author: 'user123',
          author_email: 'test@example.com',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      const tags: Tag[] = [
        { id: 'tag1', name: 'Rock' },
        { id: 'tag2', name: 'Classic' },
      ];

      const result = exportNotes(notes, tags);

      expect(result.version).toBe('1.0');
      expect(result.exported_at).toBeDefined();
      expect(result.notes).toHaveLength(1);
      
      const exportedNote = result.notes[0];
      expect(exportedNote.title).toBe('Test Note');
      expect(exportedNote.content).toBe('Test content');
      expect(exportedNote.artist).toBe('Test Artist');
      expect(exportedNote.composer).toBe('Test Composer');
      expect(exportedNote.album).toBe('Test Album');
      expect(exportedNote.release_year).toBe(2024);
      expect(exportedNote.metadata).toBe('Test metadata');
      expect(exportedNote.references).toBe('Test references');
      expect(exportedNote.tags).toEqual(['Rock', 'Classic']);
      expect(exportedNote.author).toBe('test@example.com');
      expect(exportedNote.created_at).toBe('2024-01-01T00:00:00Z');
      expect(exportedNote.updated_at).toBe('2024-01-02T00:00:00Z');
    });

    it('should convert tag IDs to tag names', () => {
      const notes: Note[] = [
        {
          id: '1',
          title: 'Test',
          content: 'Content',
          tags: ['tag1', 'tag2', 'tag3'],
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const tags: Tag[] = [
        { id: 'tag1', name: 'Jazz' },
        { id: 'tag2', name: 'Blues' },
        { id: 'tag3', name: 'Soul' },
      ];

      const result = exportNotes(notes, tags);
      expect(result.notes[0].tags).toEqual(['Jazz', 'Blues', 'Soul']);
    });

    it('should handle missing tag IDs gracefully', () => {
      const notes: Note[] = [
        {
          id: '1',
          title: 'Test',
          content: 'Content',
          tags: ['tag1', 'nonexistent'],
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const tags: Tag[] = [
        { id: 'tag1', name: 'Rock' },
      ];

      const result = exportNotes(notes, tags);
      expect(result.notes[0].tags).toEqual(['Rock']);
    });

    it('should use author email when available, fallback to author ID', () => {
      const notesWithEmail: Note[] = [
        {
          id: '1',
          title: 'Test',
          content: 'Content',
          tags: [],
          author: 'user123',
          author_email: 'user@example.com',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const notesWithoutEmail: Note[] = [
        {
          id: '2',
          title: 'Test',
          content: 'Content',
          tags: [],
          author: 'user456',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const tags: Tag[] = [];

      const resultWithEmail = exportNotes(notesWithEmail, tags);
      expect(resultWithEmail.notes[0].author).toBe('user@example.com');

      const resultWithoutEmail = exportNotes(notesWithoutEmail, tags);
      expect(resultWithoutEmail.notes[0].author).toBe('user456');
    });

    it('should handle optional fields correctly', () => {
      const notes: Note[] = [
        {
          id: '1',
          title: 'Minimal Note',
          content: 'Just content',
          tags: [],
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const tags: Tag[] = [];

      const result = exportNotes(notes, tags);
      const exportedNote = result.notes[0];
      
      expect(exportedNote.artist).toBeUndefined();
      expect(exportedNote.composer).toBeUndefined();
      expect(exportedNote.album).toBeUndefined();
      expect(exportedNote.release_year).toBeUndefined();
      expect(exportedNote.metadata).toBeUndefined();
      expect(exportedNote.references).toBeUndefined();
      expect(exportedNote.author).toBeUndefined();
      expect(exportedNote.updated_at).toBeUndefined();
    });
  });

  describe('downloadExportData', () => {
    let createElementSpy: any;
    let appendChildSpy: any;
    let removeChildSpy: any;
    let createObjectURLSpy: any;
    let revokeObjectURLSpy: any;

    beforeEach(() => {
      // Mock DOM methods
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };

      createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
      appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
      removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);
      
      // Mock URL methods
      createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should trigger download with correct filename', () => {
      const exportData: ExportData = {
        version: '1.0',
        exported_at: '2024-01-01T00:00:00Z',
        notes: [],
      };

      downloadExportData(exportData);

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      
      const mockAnchor = createElementSpy.mock.results[0].value;
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockAnchor.download).toMatch(/^music-notes-export-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it('should create and revoke object URL', () => {
      const exportData: ExportData = {
        version: '1.0',
        exported_at: '2024-01-01T00:00:00Z',
        notes: [],
      };

      downloadExportData(exportData);

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  describe('importNotes', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should require user to be logged in', async () => {
      // Mock no user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const mockFile = {
        text: vi.fn().mockResolvedValue('{}'),
      } as any;

      const result = await importNotes(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('logged in');
    });

    it('should reject invalid JSON', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockFile = {
        text: vi.fn().mockResolvedValue('invalid json'),
      } as any;

      const result = await importNotes(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('should validate file structure', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockFile = {
        text: vi.fn().mockResolvedValue(JSON.stringify({ invalid: 'structure' })),
      } as any;

      const result = await importNotes(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid file format');
    });

    it('should successfully import valid notes', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock database operations
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'tags') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [{ id: 'tag1', name: 'Rock' }],
              error: null,
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: [{ id: 'tag2', name: 'Jazz' }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'notes') {
          return {
            insert: vi.fn().mockResolvedValue({
              error: null,
            }),
          };
        }
      });

      const validExportData: ExportData = {
        version: '1.0',
        exported_at: '2024-01-01T00:00:00Z',
        notes: [
          {
            title: 'Test Note',
            content: 'Test content',
            tags: ['Rock', 'Jazz'],
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      };

      const mockFile = {
        text: vi.fn().mockResolvedValue(JSON.stringify(validExportData)),
      } as any;

      const result = await importNotes(mockFile);

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
    });
  });
});
