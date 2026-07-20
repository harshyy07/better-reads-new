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

-- 3. Create the progress table
CREATE TABLE public.progress (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users on delete cascade NOT NULL,
  book_id text NOT NULL,
  current_page integer DEFAULT 0,
  total_pages integer DEFAULT 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, book_id)
);

ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress."
  ON progress FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert own progress."
  ON progress FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update own progress."
  ON progress FOR UPDATE
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can delete own progress."
  ON progress FOR DELETE
  USING ( auth.uid() = user_id );

-- 4. Create the follows table
CREATE TABLE public.follows (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users on delete cascade NOT NULL,
  following_id text NOT NULL,
  created_at timestamp with time zone default timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own follows."
  ON follows FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert own follows."
  ON follows FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can delete own follows."
  ON follows FOR DELETE
  USING ( auth.uid() = user_id );

