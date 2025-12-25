export type Tag = {
  id: string;
  name: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[]; // array of tag IDs
  artist?: string;
  album?: string;
  release_year?: number;
  metadata?: string;
  is_pinned?: boolean;
  references?: string;
  author?: string;
  author_email?: string; // Email of the author
  author_name?: string; // Name of the author
  created_at: string;
  updated_at?: string;
};

export type UserRole = 'admin' | 'approved' | 'pending' | 'rejected';

export type UserProfile = {
  id: string;
  email: string;
  name?: string; // User's display name
  role: UserRole;
  approved_at?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
};

export type ExportNote = {
  title: string;
  content: string;
  artist?: string;
  album?: string;
  release_year?: number;
  metadata?: string;
  references?: string;
  is_pinned?: boolean;
  tags: string[]; // tag names, not IDs
  author?: string; // email or identifier
  created_at: string;
  updated_at?: string;
};

export type ExportData = {
  version: string;
  exported_at: string;
  notes: ExportNote[];
};
