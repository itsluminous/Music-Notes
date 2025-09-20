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
  metadata?: string;
  references?: string;
  created_at: string;
  updated_at?: string;
};
