-- Supabase Database Setup for Document Scanner App

-- Enable Row Level Security (RLS) for all tables
-- This ensures users can only access their own data

-- 1. Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  formatted_content TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist and create new ones
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;

-- Create RLS policies for documents table
CREATE POLICY "Users can view their own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Create trigger to automatically update updated_at on documents table
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- 7. Create a profiles table for additional user information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and create new ones
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Improved function to handle new user registration with better error handling
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the user creation
      RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- 9. Create the trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 10. Create storage bucket for document images (if not exists)
-- This should be run in the Supabase Storage section or via the dashboard
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('document-images', 'document-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- 11. Storage policies for document images
-- Uncomment these if you're using storage bucket
-- DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- CREATE POLICY "Users can upload their own images" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'document-images' AND 
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Users can view their own images" ON storage.objects
--   FOR SELECT USING (
--     bucket_id = 'document-images' AND 
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Users can update their own images" ON storage.objects
--   FOR UPDATE USING (
--     bucket_id = 'document-images' AND 
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Users can delete their own images" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'document-images' AND 
--     auth.uid()::text = (storage.foldername(name))[1]
--   );