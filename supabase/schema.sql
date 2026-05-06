-- Create a profiles table for user metadata
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  is_subscriber BOOLEAN DEFAULT FALSE,
  memes_generated_today INTEGER DEFAULT 0,
  last_generation_date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a memes table to store generated content
CREATE TABLE public.memes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  top_lines JSONB,
  bottom_lines JSONB,
  style TEXT,
  language TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.memes ENABLE ROW LEVEL SECURITY;

-- Create policies for memes
CREATE POLICY "Users can view their own memes." ON public.memes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memes." ON public.memes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memes." ON public.memes
  FOR DELETE USING (auth.uid() = user_id);

-- 7. STORAGE CONFIGURATION
-- Ensure the 'memes' bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('memes', 'memes', true)
ON CONFLICT (id) DO NOTHING;

-- STORAGE POLICIES
-- Allow public access to view memes (Necessary for <img> tags to work)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'memes');

-- Allow authenticated users to upload their own memes
DROP POLICY IF EXISTS "Users can upload memes" ON storage.objects;
CREATE POLICY "Users can upload memes" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'memes' AND 
    auth.role() = 'authenticated'
  );

-- Allow users to delete their own memes
DROP POLICY IF EXISTS "Users can delete their own memes" ON storage.objects;
CREATE POLICY "Users can delete their own memes" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'memes' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create a table for global custom languages
CREATE TABLE public.app_languages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.app_languages ENABLE ROW LEVEL SECURITY;

-- Create policies for languages
CREATE POLICY "Public languages are viewable by everyone." ON public.app_languages
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert languages." ON public.app_languages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Insert default languages
INSERT INTO public.app_languages (name) VALUES 
('English'), ('Hindi'), ('Hinglish'), ('Tamil'), ('Telugu')
ON CONFLICT (name) DO NOTHING;

