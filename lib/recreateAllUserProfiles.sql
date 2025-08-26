-- ================================
-- Recreate User Profiles Table for ALL USERS
-- ================================

-- Drop the table if it exists (to start fresh)
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Create the complete user_profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    
    -- Name fields
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    
    -- User type
    user_type TEXT NOT NULL DEFAULT 'student' CHECK (user_type IN ('student', 'staff', 'visitor')),
    
    -- Academic Information
    student_id TEXT UNIQUE,
    staff_id TEXT UNIQUE,
    department TEXT,
    faculty TEXT,
    level TEXT, -- For students: 100, 200, 300, 400, 500
    position TEXT, -- For staff positions
    cgpa DECIMAL(3,2),
    
    -- Contact Information
    phone_number TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    address TEXT,
    
    -- Profile Information
    bio TEXT,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    nationality TEXT,
    state_of_origin TEXT,
    
    -- Profile Settings
    profile_picture_url TEXT,
    profile_completed BOOLEAN DEFAULT false,
    profile_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Privacy Settings
    public_profile BOOLEAN DEFAULT false,
    show_email BOOLEAN DEFAULT true,
    show_phone BOOLEAN DEFAULT false,
    show_department BOOLEAN DEFAULT true,
    
    -- Account Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Push Notification Support
    push_token TEXT,
    push_token_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- Create Indexes for Performance
-- ================================
CREATE INDEX idx_user_profiles_user_type ON user_profiles(user_type);
CREATE INDEX idx_user_profiles_department ON user_profiles(department);
CREATE INDEX idx_user_profiles_faculty ON user_profiles(faculty);
CREATE INDEX idx_user_profiles_level ON user_profiles(level);
CREATE INDEX idx_user_profiles_position ON user_profiles(position);
CREATE INDEX idx_user_profiles_student_id ON user_profiles(student_id);
CREATE INDEX idx_user_profiles_staff_id ON user_profiles(staff_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX idx_user_profiles_push_token ON user_profiles(push_token);

-- ================================
-- Create Triggers for Updated At
-- ================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- Enable Row Level Security
-- ================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON user_profiles;

-- Create RLS policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Public profiles are viewable by everyone" ON user_profiles
    FOR SELECT USING (
        public_profile = true 
        AND is_active = true 
        AND auth.role() = 'authenticated'
    );

-- ================================
-- Create Profile Auto-Creation Trigger
-- ================================
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    user_meta JSONB;
BEGIN
    -- Get user metadata
    user_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    
    -- Insert into user_profiles
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
        profile_completed,
        email_verified,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(user_meta->>'first_name', ''),
        COALESCE(user_meta->>'last_name', ''),
        COALESCE(user_meta->>'full_name', CONCAT(
            COALESCE(user_meta->>'first_name', ''), 
            ' ', 
            COALESCE(user_meta->>'last_name', '')
        )),
        COALESCE(user_meta->>'user_type', 'student'),
        COALESCE(user_meta->>'department', ''),
        COALESCE(user_meta->>'faculty', ''),
        COALESCE(user_meta->>'level', ''),
        COALESCE(user_meta->>'position', ''),
        COALESCE((user_meta->>'profile_completed')::boolean, false),
        COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
        NOW(),
        NOW()
    );
    
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log the error but don't fail the signup
        RAISE WARNING 'Failed to create user profile for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger
DROP TRIGGER IF EXISTS create_user_profile_on_signup ON auth.users;

-- Create trigger for auto profile creation
CREATE TRIGGER create_user_profile_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile_on_signup();

-- ================================
-- Push Token Management Functions
-- ================================
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_user_push_token(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_user_push_token(UUID) TO authenticated;

-- ================================
-- Recreate ALL User Profiles from auth.users
-- ================================

DO $$ 
BEGIN
    RAISE NOTICE 'Starting to recreate profiles for all existing users...';
END $$;

-- Insert profiles for ALL existing users in auth.users
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
    student_id,
    staff_id,
    profile_completed,
    email_verified,
    is_active,
    created_at,
    updated_at
) 
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'first_name', 
             NULLIF(split_part(COALESCE(au.raw_user_meta_data->>'full_name', au.email), ' ', 1), '')),
    COALESCE(au.raw_user_meta_data->>'last_name', 
             NULLIF(split_part(COALESCE(au.raw_user_meta_data->>'full_name', ''), ' ', 2), '')),
    COALESCE(au.raw_user_meta_data->>'full_name', 
             CONCAT(
                 COALESCE(au.raw_user_meta_data->>'first_name', split_part(au.email, '@', 1)), 
                 ' ', 
                 COALESCE(au.raw_user_meta_data->>'last_name', '')
             )),
    COALESCE(au.raw_user_meta_data->>'user_type', 'student'),
    COALESCE(au.raw_user_meta_data->>'department', ''),
    COALESCE(au.raw_user_meta_data->>'faculty', ''),
    COALESCE(au.raw_user_meta_data->>'level', ''),
    COALESCE(au.raw_user_meta_data->>'position', ''),
    COALESCE(au.raw_user_meta_data->>'student_id', ''),
    COALESCE(au.raw_user_meta_data->>'staff_id', ''),
    COALESCE((au.raw_user_meta_data->>'profile_completed')::boolean, false),
    COALESCE(au.email_confirmed_at IS NOT NULL, false),
    true, -- is_active
    COALESCE(au.created_at, NOW()),
    NOW()
FROM auth.users au
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    full_name = EXCLUDED.full_name,
    user_type = EXCLUDED.user_type,
    department = EXCLUDED.department,
    faculty = EXCLUDED.faculty,
    level = EXCLUDED.level,
    position = EXCLUDED.position,
    student_id = EXCLUDED.student_id,
    staff_id = EXCLUDED.staff_id,
    email_verified = EXCLUDED.email_verified,
    updated_at = NOW();

-- ================================
-- Update Notifications Table for Push Support
-- ================================

-- Check if notifications table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        -- Find and drop any existing type constraint
        DECLARE
            constraint_name TEXT;
        BEGIN
            SELECT tc.constraint_name INTO constraint_name
            FROM information_schema.table_constraints tc 
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'notifications' 
            AND ccu.column_name = 'type' 
            AND tc.constraint_type = 'CHECK';
            
            IF constraint_name IS NOT NULL THEN
                EXECUTE 'ALTER TABLE notifications DROP CONSTRAINT ' || constraint_name;
                RAISE NOTICE 'Dropped existing constraint: %', constraint_name;
            END IF;
        END;

        -- Add the new constraint with content_notification type
        ALTER TABLE notifications 
        ADD CONSTRAINT notifications_type_check 
        CHECK (type IN ('class_reminder', 'exam_reminder', 'deadline_reminder', 'content_notification', 'custom'));
        
        RAISE NOTICE 'Updated notifications table with content_notification support';
    ELSE
        RAISE NOTICE 'Notifications table does not exist - will be created by notification service';
    END IF;
END $$;

-- ================================
-- Verification and Summary
-- ================================
SELECT 
    'All user profiles recreated successfully!' as status,
    COUNT(*) as total_profiles_created
FROM user_profiles;

DO $$ 
BEGIN
    RAISE NOTICE 'User profiles summary:';
END $$;

-- Show summary by user type
SELECT 
    user_type,
    COUNT(*) as count,
    string_agg(DISTINCT COALESCE(department, 'No Department'), ', ') as departments
FROM user_profiles 
GROUP BY user_type
ORDER BY user_type;

-- Show all profiles (limited to key info)
SELECT 
    email,
    full_name,
    first_name,
    last_name,
    user_type,
    department,
    faculty,
    level,
    position
FROM user_profiles 
ORDER BY user_type, email;
