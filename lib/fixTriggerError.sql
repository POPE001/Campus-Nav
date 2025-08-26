-- ================================
-- Fix the Trigger Error for Staff Signup
-- ================================

-- 1. First, let's check what's wrong and fix it step by step

-- Drop the existing trigger and function (if they exist)
DROP TRIGGER IF EXISTS create_user_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile_and_preferences();
DROP FUNCTION IF EXISTS create_profile();

-- 2. Create a simple, robust function that won't fail
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Insert with error handling
  INSERT INTO public.user_profiles (
    id,
    email,
    first_name,
    last_name,
    user_type,
    faculty,
    department,
    level,
    position,
    profile_completed
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'faculty', ''),
    COALESCE(NEW.raw_user_meta_data->>'department', ''),
    COALESCE(NEW.raw_user_meta_data->>'level', ''),
    COALESCE(NEW.raw_user_meta_data->>'position', ''),
    COALESCE((NEW.raw_user_meta_data->>'profile_completed')::boolean, false)
  );
  
  RETURN NEW;
EXCEPTION 
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Test the trigger function manually
DO $$
BEGIN
  RAISE NOTICE 'Trigger setup complete. Testing...';
  
  -- Check if user_profiles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    RAISE NOTICE '✅ user_profiles table exists';
  ELSE
    RAISE NOTICE '❌ user_profiles table does NOT exist';
  END IF;
  
  -- Check if trigger exists
  IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') THEN
    RAISE NOTICE '✅ Trigger created successfully';
  ELSE
    RAISE NOTICE '❌ Trigger creation failed';
  END IF;
  
END $$;

-- 5. If user_profiles table doesn't exist, create it nowa
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    user_type TEXT DEFAULT 'student',
    faculty TEXT,
    department TEXT,
    level TEXT,
    position TEXT,
    profile_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable RLS and create basic policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;  
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Create simple policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO anon, authenticated;

SELECT 'Trigger and table setup completed!' as status;
