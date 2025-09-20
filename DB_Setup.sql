-- Create tags table
CREATE TABLE public.tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, name)
);

-- Enable Row Level Security for tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Policy for tags: Users can view their own tags
CREATE POLICY "Users can view their own tags."
ON public.tags FOR SELECT
USING (auth.uid() = user_id);

-- Policy for tags: Users can insert their own tags
CREATE POLICY "Users can insert their own tags."
ON public.tags FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for tags: Users can update their own tags
CREATE POLICY "Users can update their own tags."
ON public.tags FOR UPDATE
USING (auth.uid() = user_id);

-- Policy for tags: Users can delete their own tags
CREATE POLICY "Users can delete their own tags."
ON public.tags FOR DELETE
USING (auth.uid() = user_id);


-- Create notes table
CREATE TABLE public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    artist TEXT,
    album TEXT,
    metadata TEXT,
    "references" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Policy for notes: Users can view their own notes
CREATE POLICY "Users can view their own notes."
ON public.notes FOR SELECT
USING (auth.uid() = user_id);

-- Policy for notes: Users can insert their own notes
CREATE POLICY "Users can insert their own notes."
ON public.notes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for notes: Users can update their own notes
CREATE POLICY "Users can update their own notes."
ON public.notes FOR UPDATE
USING (auth.uid() = user_id);

-- Policy for notes: Users can delete their own notes
CREATE POLICY "Users can delete their own notes."
ON public.notes FOR DELETE
USING (auth.uid() = user_id);


-- Create note_tags table
CREATE TABLE public.note_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
    UNIQUE (user_id, note_id, tag_id)
);

-- Enable Row Level Security for note_tags
ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;

-- Policy for note_tags: Users can view their own note_tags
CREATE POLICY "Users can view their own note_tags."
ON public.note_tags FOR SELECT
USING (auth.uid() = user_id);

-- Policy for note_tags: Users can insert their own note_tags
CREATE POLICY "Users can insert their own note_tags."
ON public.note_tags FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for note_tags: Users can update their own note_tags
CREATE POLICY "Users can update their own note_tags."
ON public.note_tags FOR UPDATE
USING (auth.uid() = user_id);

-- Policy for note_tags: Users can delete their own note_tags
CREATE POLICY "Users can delete their own note_tags."
ON public.note_tags FOR DELETE
USING (auth.uid() = user_id);
