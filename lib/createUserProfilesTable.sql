-- ================================
-- Create user_profiles Table From Scratch
-- ================================

-- First, create the user_profiles table with ALL required columns
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    user_type TEXT DEFAULT 'student' CHECK (user_type IN ('student', 'staff')),
    
    -- Academic Information
    student_id TEXT UNIQUE,
    staff_id TEXT UNIQUE,
    department TEXT,
    faculty TEXT,
    level TEXT,
    position TEXT,  -- For staff positions (this was missing!)
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
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
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

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- App Preferences
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    language TEXT DEFAULT 'en' CHECK (language IN ('en', 'yo', 'ig', 'ha')),
    timezone TEXT DEFAULT 'Africa/Lagos',
    
    -- Map Preferences
    default_map_view TEXT DEFAULT 'campus' CHECK (default_map_view IN ('campus', 'satellite', 'hybrid')),
    show_all_venues BOOLEAN DEFAULT true,
    auto_center_map BOOLEAN DEFAULT true,
    
    -- Timetable Preferences
    week_start_day INTEGER DEFAULT 1 CHECK (week_start_day BETWEEN 0 AND 6),
    default_view TEXT DEFAULT 'week' CHECK (default_view IN ('day', 'week', 'month')),
    show_time_conflicts BOOLEAN DEFAULT true,
    
    -- Privacy Preferences
    analytics_consent BOOLEAN DEFAULT false,
    crash_reporting_consent BOOLEAN DEFAULT true,
    marketing_consent BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to handle user profile creation on signup
CREATE OR REPLACE FUNCTION create_user_profile_and_preferences()
RETURNS TRIGGER AS $$
DECLARE
    user_meta JSONB;
BEGIN
    -- Get user metadata from signup
    user_meta := NEW.raw_user_meta_data;
    
    -- Insert into user_profiles
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
        CONCAT(
            COALESCE(user_meta->>'first_name', ''), 
            ' ', 
            COALESCE(user_meta->>'last_name', '')
        )
    );
    
    -- Create user preferences
    INSERT INTO user_preferences (user_id) 
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail signup
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS create_user_profile_on_signup ON auth.users;
CREATE TRIGGER create_user_profile_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile_and_preferences();

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for user_preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_user_type ON user_profiles(user_type);
CREATE INDEX idx_user_profiles_department ON user_profiles(department);
CREATE INDEX idx_user_profiles_faculty ON user_profiles(faculty);
CREATE INDEX idx_user_profiles_position ON user_profiles(position);
CREATE INDEX idx_user_profiles_student_id ON user_profiles(student_id);
CREATE INDEX idx_user_profiles_staff_id ON user_profiles(staff_id);
CREATE INDEX idx_user_profiles_is_active ON user_profiles(is_active);

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify everything was created successfully
SELECT 'SUCCESS: user_profiles table created with all required columns!' as status;

-- Show all columns in the table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;
