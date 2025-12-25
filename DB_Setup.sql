-- Database Setup - Multi-user approval system
-- This script creates the complete schema for the multi-user collaborative platform
--
-- Key Design Decisions:
-- 1. Public Read Access: Notes table uses RLS policy "USING (true)" to allow
--    anonymous visitors to view all notes without authentication
-- 2. Restricted Writes: INSERT/UPDATE/DELETE policies check user_profiles.role
--    to ensure only 'admin' or 'approved' users can modify data
-- 3. First User Admin: The handle_new_user() function automatically assigns
--    'admin' role to the first user, 'pending' to all subsequent users
-- 4. Author Attribution: Notes table includes 'author' column to track who
--    created or last edited each note
-- 5. SECURITY DEFINER Functions: Helper functions bypass RLS to prevent infinite recursion

-- ============================================================================
-- Helper Functions for RLS Policies
-- ============================================================================

-- Function to check if a user is an admin
-- SECURITY DEFINER bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is approved (admin or approved role)
-- SECURITY DEFINER bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_approved(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = user_id AND role IN ('admin', 'approved')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to allow users to delete their own auth account
-- This is called when a rejected user tries to login
-- SECURITY DEFINER allows deletion from auth.users
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void AS $$
BEGIN
    DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- User Profiles Table
-- ============================================================================

-- Create user_profiles table for role-based access control
-- This table stores user approval status and role information
-- Roles: 'admin' (first user), 'approved' (can edit), 'pending' (awaiting approval), 'rejected' (denied)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT, -- User's display name
    role TEXT NOT NULL DEFAULT 'pending', -- 'admin', 'approved', 'pending', 'rejected'
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
-- This allows users to see their own role and approval status
CREATE POLICY "Users can view their own profile."
ON public.user_profiles FOR SELECT
USING (auth.uid() = id);

-- Policy: Admins can view all profiles
-- Uses SECURITY DEFINER function to avoid infinite recursion
CREATE POLICY "Admins can view all profiles."
ON public.user_profiles FOR SELECT
USING (public.is_admin(auth.uid()));

-- Policy: Only admins can update user profiles
-- Uses SECURITY DEFINER function to avoid infinite recursion
CREATE POLICY "Admins can update profiles."
ON public.user_profiles FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Policy: Only admins can delete user profiles
-- Uses SECURITY DEFINER function to avoid infinite recursion
-- Allows admins to remove abusive or problematic users
CREATE POLICY "Admins can delete profiles."
ON public.user_profiles FOR DELETE
USING (public.is_admin(auth.uid()));

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

-- RLS Policy: Public read access for tags
-- Anyone can view tags (needed for anonymous users to see tags on notes)
CREATE POLICY "Anyone can view tags."
ON public.tags FOR SELECT
USING (true);

-- RLS Policy: Only approved users can create tags
-- Uses SECURITY DEFINER function to avoid infinite recursion
CREATE POLICY "Approved users can insert tags."
ON public.tags FOR INSERT
WITH CHECK (public.is_approved(auth.uid()));

-- RLS Policy: Only approved users can update tags
-- Uses SECURITY DEFINER function to avoid infinite recursion
CREATE POLICY "Approved users can update tags."
ON public.tags FOR UPDATE
USING (public.is_approved(auth.uid()));

-- RLS Policy: Only approved users can delete tags
-- Uses SECURITY DEFINER function to avoid infinite recursion
CREATE POLICY "Approved users can delete tags."
ON public.tags FOR DELETE
USING (public.is_approved(auth.uid()));


-- Create notes table with author column
CREATE TABLE public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    author UUID REFERENCES auth.users(id), -- Current/last editor
    title TEXT NOT NULL,
    content TEXT,
    artist TEXT,
    album TEXT,
    release_year INTEGER,
    metadata TEXT,
    "references" TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public read access for notes
-- USING (true) means this policy allows all SELECT queries regardless of authentication
-- This enables anonymous visitors to view all notes without logging in
-- This is the core policy that enables the public access model
CREATE POLICY "Anyone can view notes."
ON public.notes FOR SELECT
USING (true);

-- RLS Policy: Restrict note creation to approved users
-- WITH CHECK verifies the condition when inserting new rows
-- Uses SECURITY DEFINER function to avoid infinite recursion
CREATE POLICY "Approved users can insert notes."
ON public.notes FOR INSERT
WITH CHECK (public.is_approved(auth.uid()));

-- RLS Policy: Restrict note updates to approved users
-- USING clause verifies the condition for UPDATE operations
-- Uses SECURITY DEFINER function to avoid infinite recursion
CREATE POLICY "Approved users can update notes."
ON public.notes FOR UPDATE
USING (public.is_approved(auth.uid()));

-- RLS Policy: Restrict note deletion to approved users
-- USING clause verifies the condition for DELETE operations
-- Uses SECURITY DEFINER function to avoid infinite recursion
CREATE POLICY "Approved users can delete notes."
ON public.notes FOR DELETE
USING (public.is_approved(auth.uid()));


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

-- RLS Policy: Public read access for note_tags
-- Anyone can view note-tag associations (needed for anonymous users to see tags on notes)
CREATE POLICY "Anyone can view note_tags."
ON public.note_tags FOR SELECT
USING (true);

-- RLS Policy: Only approved users can create note_tags
-- Uses SECURITY DEFINER function to avoid infinite recursion
CREATE POLICY "Approved users can insert note_tags."
ON public.note_tags FOR INSERT
WITH CHECK (public.is_approved(auth.uid()));

-- RLS Policy: Only approved users can update note_tags
-- Uses SECURITY DEFINER function to avoid infinite recursion
CREATE POLICY "Approved users can update note_tags."
ON public.note_tags FOR UPDATE
USING (public.is_approved(auth.uid()));

-- RLS Policy: Only approved users can delete note_tags
-- Uses SECURITY DEFINER function to avoid infinite recursion
CREATE POLICY "Approved users can delete note_tags."
ON public.note_tags FOR DELETE
USING (public.is_approved(auth.uid()));


-- Function to automatically create user profile on signup
-- This function is triggered when a new user is created in auth.users
-- 
-- First User Admin Logic:
-- - Counts existing users in user_profiles table
-- - If count is 0, assigns 'admin' role to the new user
-- - Otherwise, assigns 'pending' role requiring admin approval
-- 
-- SECURITY DEFINER: Function runs with privileges of the function owner,
-- allowing it to insert into user_profiles even when RLS is enabled
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Count existing users in user_profiles
    -- This determines if the new user is the first user
    SELECT COUNT(*) INTO user_count FROM public.user_profiles;
    
    -- Insert new user profile
    -- First user (count = 0) becomes admin automatically
    -- All subsequent users start as pending and require admin approval
    INSERT INTO public.user_profiles (id, email, role)
    VALUES (
        NEW.id,
        NEW.email,
        CASE WHEN user_count = 0 THEN 'admin' ELSE 'pending' END
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
-- Executes AFTER INSERT on auth.users to ensure the user record exists
-- before creating the corresponding profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
