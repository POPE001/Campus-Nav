-- ================================
-- Recreate User Profiles Table for ALL USERS (Simple Version)
-- ================================

-- Drop the table if it exists
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Create the complete user_profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    user_type TEXT NOT NULL DEFAULT 'student' CHECK (user_type IN ('student', 'staff', 'visitor')),
    student_id TEXT UNIQUE,
    staff_id TEXT UNIQUE,
    department TEXT,
    faculty TEXT,
    level TEXT,
    position TEXT,
    cgpa DECIMAL(3,2),
    phone_number TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    address TEXT,
    bio TEXT,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    nationality TEXT,
    state_of_origin TEXT,
    profile_picture_url TEXT,
    profile_completed BOOLEAN DEFAULT false,
    profile_completed_at TIMESTAMP WITH TIME ZONE,
    public_profile BOOLEAN DEFAULT false,
    show_email BOOLEAN DEFAULT true,
    show_phone BOOLEAN DEFAULT false,
    show_department BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    push_token TEXT,
    push_token_updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_profiles_user_type ON user_profiles(user_type);
CREATE INDEX idx_user_profiles_department ON user_profiles(department);
CREATE INDEX idx_user_profiles_faculty ON user_profiles(faculty);
CREATE INDEX idx_user_profiles_level ON user_profiles(level);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_push_token ON user_profiles(push_token);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Insert profiles for all existing users
INSERT INTO user_profiles (
    id,
    email,
    first_name,
    last_name,
    full_name,
    user_type,
    department,
    faculty,
    level,
    position,
    email_verified,
    is_active,
    created_at,
    updated_at
) 
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'first_name', split_part(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'user_type', 'student'),
    COALESCE(au.raw_user_meta_data->>'department', ''),
    COALESCE(au.raw_user_meta_data->>'faculty', ''),
    COALESCE(au.raw_user_meta_data->>'level', ''),
    COALESCE(au.raw_user_meta_data->>'position', ''),
    COALESCE(au.email_confirmed_at IS NOT NULL, false),
    true,
    COALESCE(au.created_at, NOW()),
    NOW()
FROM auth.users au;

-- Create push token functions
CREATE OR REPLACE FUNCTION update_user_push_token(
    user_id_param UUID,
    push_token_param TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_profiles 
    SET 
        push_token = push_token_param,
        push_token_updated_at = NOW(),
        updated_at = NOW()
    WHERE id = user_id_param;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION clear_user_push_token(
    user_id_param UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_profiles 
    SET 
        push_token = NULL,
        push_token_updated_at = NOW(),
        updated_at = NOW()
    WHERE id = user_id_param;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_user_push_token(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_user_push_token(UUID) TO authenticated;

-- Show results
SELECT 
    'All user profiles recreated successfully!' as status,
    COUNT(*) as total_profiles_created
FROM user_profiles;

SELECT 
    email,
    full_name,
    user_type,
    department,
    faculty
FROM user_profiles 
ORDER BY user_type, email;

