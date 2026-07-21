-- RUN THESE STATEMENTS IN YOUR SUPABASE SQL EDITOR TO SETUP ENHANCED FEATURES

-- 1. Create the reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users on delete cascade NOT NULL,
  book_id text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone default timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reviews are viewable by everyone."
  ON reviews FOR SELECT USING ( true );

CREATE POLICY "Users can insert their own reviews."
  ON reviews FOR INSERT WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can delete their own reviews."
  ON reviews FOR DELETE USING ( auth.uid() = user_id );


-- 2. Create the ratings table
CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users on delete cascade NOT NULL,
  book_id text NOT NULL,
  rating numeric NOT NULL CHECK (rating >= 0.5 AND rating <= 5.0),
  created_at timestamp with time zone default timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, book_id)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public ratings are viewable by everyone."
  ON ratings FOR SELECT USING ( true );

CREATE POLICY "Users can insert/update their own ratings."
  ON ratings FOR ALL USING ( auth.uid() = user_id );


-- 3. Create the threads table
CREATE TABLE IF NOT EXISTS public.threads (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users on delete cascade NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  tag text DEFAULT 'Discussion',
  likes integer DEFAULT 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public threads are viewable by everyone."
  ON threads FOR SELECT USING ( true );

CREATE POLICY "Users can insert their own threads."
  ON threads FOR INSERT WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update their own threads (e.g. likes)."
  ON threads FOR UPDATE USING ( true );


-- 4. Create the comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  thread_id uuid REFERENCES public.threads on delete cascade NOT NULL,
  user_id uuid REFERENCES auth.users on delete cascade NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone default timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public comments are viewable by everyone."
  ON comments FOR SELECT USING ( true );

CREATE POLICY "Users can insert their own comments."
  ON comments FOR INSERT WITH CHECK ( auth.uid() = user_id );


-- 5. Create the clubs table
CREATE TABLE IF NOT EXISTS public.clubs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  created_at timestamp with time zone default timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public clubs are viewable by everyone."
  ON clubs FOR SELECT USING ( true );

CREATE POLICY "Authenticated users can create clubs."
  ON clubs FOR INSERT WITH CHECK ( auth.uid() IS NOT NULL );


-- 6. Create the club_members table
CREATE TABLE IF NOT EXISTS public.club_members (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  club_id uuid REFERENCES public.clubs on delete cascade NOT NULL,
  user_id uuid REFERENCES auth.users on delete cascade NOT NULL,
  created_at timestamp with time zone default timezone('utc'::text, now()) NOT NULL,
  UNIQUE(club_id, user_id)
);

ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public club memberships are viewable by everyone."
  ON club_members FOR SELECT USING ( true );

CREATE POLICY "Users can manage their own club memberships."
  ON club_members FOR ALL USING ( auth.uid() = user_id );


-- 7. Create the club_discussions table
CREATE TABLE IF NOT EXISTS public.club_discussions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  club_id uuid REFERENCES public.clubs on delete cascade NOT NULL,
  user_id uuid REFERENCES auth.users on delete cascade NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone default timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.club_discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public club discussions are viewable by everyone."
  ON club_discussions FOR SELECT USING ( true );

CREATE POLICY "Users can post to their own club discussions."
  ON club_discussions FOR INSERT WITH CHECK ( auth.uid() = user_id );
