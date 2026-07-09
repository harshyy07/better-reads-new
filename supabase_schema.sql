-- Run this in your Supabase SQL Editor to set up the database schema

-- 1. Create the profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users on delete cascade,
  username text,
  avatar text,
  created_at timestamp with time zone default timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

-- Set up Row Level Security (RLS) for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
  ON profiles FOR SELECT
  USING ( true );

CREATE POLICY "Users can insert their own profile."
  ON profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile."
  ON profiles FOR UPDATE
  USING ( auth.uid() = id );

-- 2. Create the shelves table
CREATE TABLE public.shelves (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users on delete cascade NOT NULL,
  type text NOT NULL, -- 'tbr', 'reading', 'completed', 'dnf'
  book_ids text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, type)
);

-- Set up Row Level Security (RLS) for shelves
ALTER TABLE public.shelves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shelves."
  ON shelves FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert their own shelves."
  ON shelves FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update their own shelves."
  ON shelves FOR UPDATE
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can delete their own shelves."
  ON shelves FOR DELETE
  USING ( auth.uid() = user_id );
