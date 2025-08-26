-- ================================
-- Fix Staff Signup Database Issues
-- ================================

-- 1. Add the missing 'position' column for staff
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'position'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN position TEXT;
        RAISE NOTICE 'Added position column to user_profiles table';
    ELSE
        RAISE NOTICE 'Position column already exists';
    END IF;
END $$;

-- 2. Ensure user_profiles table exists with all required columns
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    user_type TEXT DEFAULT 'student',
    
    -- Academic Information
    student_id TEXT UNIQUE,
    staff_id TEXT UNIQUE,
    department TEXT,
    faculty TEXT,
    level TEXT,
    position TEXT,  -- For staff positions
    cgpa DECIMAL(3,2),
    
    -- Contact Information
    phone_number TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    address TEXT,
    
    -- Profile Settings
    profile_picture_url TEXT,
    bio TEXT,
    date_of_birth DATE,
    gender TEXT,
    nationality TEXT,
    state_of_origin TEXT,
    
    -- Account Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    profile_completed BOOLEAN DEFAULT false,
    
    -- Privacy Settings
    show_phone BOOLEAN DEFAULT false,
    show_email BOOLEAN DEFAULT true,
    show_department BOOLEAN DEFAULT true,
    public_profile BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    profile_completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Create function to handle user profile creation
CREATE OR REPLACE FUNCTION create_user_profile_and_preferences()
RETURNS TRIGGER AS $$
DECLARE
    user_meta JSONB;
BEGIN
    -- Get user metadata from auth
    user_meta := NEW.raw_user_meta_data;
    
    -- Insert into user_profiles with data from signup
    INSERT INTO user_profiles (
        id,
        email,
        first_name,
        last_name,
        user_type,
        department,
        faculty,
        level,
        position,
        profile_completed,
        full_name
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(user_meta->>'first_name', ''),
        COALESCE(user_meta->>'last_name', ''),
        COALESCE(user_meta->>'user_type', 'student'),
        COALESCE(user_meta->>'department', ''),
        COALESCE(user_meta->>'faculty', ''),
        COALESCE(user_meta->>'level', ''),
        COALESCE(user_meta->>'position', ''),
        COALESCE((user_meta->>'profile_completed')::boolean, false),
        CONCAT(COALESCE(user_meta->>'first_name', ''), ' ', COALESCE(user_meta->>'last_name', ''))
    );
    
    -- Create user preferences with defaults
    INSERT INTO user_preferences (user_id) 
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'system',
    language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'Africa/Lagos',
    default_map_view TEXT DEFAULT 'campus',
    show_all_venues BOOLEAN DEFAULT true,
    auto_center_map BOOLEAN DEFAULT true,
    week_start_day INTEGER DEFAULT 1,
    default_view TEXT DEFAULT 'week',
    show_time_conflicts BOOLEAN DEFAULT true,
    analytics_consent BOOLEAN DEFAULT false,
    crash_reporting_consent BOOLEAN DEFAULT true,
    marketing_consent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS create_user_profile_on_signup ON auth.users;

CREATE TRIGGER create_user_profile_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile_and_preferences();

-- 6. Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Preferences policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;

CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. Update function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_type ON user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_department ON user_profiles(department);
CREATE INDEX IF NOT EXISTS idx_user_profiles_faculty ON user_profiles(faculty);
CREATE INDEX IF NOT EXISTS idx_user_profiles_position ON user_profiles(position);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);

-- 10. Verify the setup
DO $$
DECLARE
    column_count INTEGER;
    trigger_count INTEGER;
BEGIN
    -- Check if position column exists
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'position';
    
    -- Check if trigger exists
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_name = 'create_user_profile_on_signup';
    
    RAISE NOTICE 'Setup verification:';
    RAISE NOTICE 'Position column exists: %', (column_count > 0);
    RAISE NOTICE 'Profile creation trigger exists: %', (trigger_count > 0);
END $$;

SELECT 
    'Staff signup database fix completed!' as status,
    'Position column added, trigger created, RLS enabled' as details;
