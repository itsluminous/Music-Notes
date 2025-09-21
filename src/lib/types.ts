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
  isPinned?: boolean;
  references?: string;
  created_at: string;
  updated_at?: string;
};
