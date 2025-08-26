-- ================================
-- Fix user_profiles Table - Add ALL Missing Columns
-- ================================

-- Add ALL essential columns that might be missing
DO $$ 
BEGIN
    -- Add email column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'email'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN email TEXT;
    END IF;
    
    -- Add full_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'full_name'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN full_name TEXT;
    END IF;
    
    -- Add first_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'first_name'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN first_name TEXT;
    END IF;
    
    -- Add last_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'last_name'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN last_name TEXT;
    END IF;
    
    -- Add user_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'user_type'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN user_type TEXT DEFAULT 'student';
    END IF;
    
    -- Add department column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'department'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN department TEXT;
    END IF;
    
    -- Add faculty column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'faculty'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN faculty TEXT;
    END IF;
    
    -- Add level column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'level'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN level TEXT;
    END IF;
    
    -- Add phone_number column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN phone_number TEXT;
    END IF;
    
    -- Add bio column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'bio'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN bio TEXT;
    END IF;
    
    -- Add profile_picture_url column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'profile_picture_url'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN profile_picture_url TEXT;
    END IF;
    
    -- Add status columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'is_verified'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN email_verified BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'phone_verified'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN phone_verified BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'profile_completed'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN profile_completed BOOLEAN DEFAULT false;
    END IF;
    
    -- Add privacy columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'show_phone'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN show_phone BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'show_email'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN show_email BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'show_department'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN show_department BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'public_profile'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN public_profile BOOLEAN DEFAULT false;
    END IF;
    
    -- Add timestamp columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'last_login_at'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'profile_completed_at'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN profile_completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
END $$;

-- Update existing rows to have email from auth.users if missing
UPDATE user_profiles 
SET email = auth_users.email
FROM auth.users auth_users
WHERE user_profiles.id = auth_users.id 
AND (user_profiles.email IS NULL OR user_profiles.email = '');

-- Drop and recreate the view safely
DROP VIEW IF EXISTS user_statistics;

CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    up.id,
    
    -- Course Statistics
    COALESCE(course_stats.total_courses, 0) as courses_scheduled,
    COALESCE(course_stats.active_courses, 0) as active_courses,
    COALESCE(course_stats.upcoming_exams, 0) as upcoming_exams,
    COALESCE(course_stats.pending_deadlines, 0) as pending_deadlines,
    
    -- Notification Statistics
    COALESCE(notification_stats.total_notifications, 0) as total_reminders,
    COALESCE(notification_stats.scheduled_notifications, 0) as scheduled_reminders,
    COALESCE(notification_stats.delivered_notifications, 0) as delivered_reminders,
    
    -- Default activity stats (no user_activity table)
    0 as total_logins,
    1 as login_streak,
    1 as days_active,
    up.created_at as last_activity,
    
    -- Profile Completion
    CASE 
        WHEN up.full_name IS NOT NULL AND up.full_name != ''
         AND up.department IS NOT NULL AND up.department != ''
         AND up.faculty IS NOT NULL AND up.faculty != ''
         AND (up.user_type = 'staff' OR (up.level IS NOT NULL AND up.level != ''))
        THEN ROUND((
            (CASE WHEN up.full_name IS NOT NULL AND up.full_name != '' THEN 1 ELSE 0 END +
             CASE WHEN up.department IS NOT NULL AND up.department != '' THEN 1 ELSE 0 END +
             CASE WHEN up.faculty IS NOT NULL AND up.faculty != '' THEN 1 ELSE 0 END +
             CASE WHEN up.phone_number IS NOT NULL AND up.phone_number != '' THEN 1 ELSE 0 END +
             CASE WHEN up.bio IS NOT NULL AND up.bio != '' THEN 1 ELSE 0 END +
             CASE WHEN up.profile_picture_url IS NOT NULL AND up.profile_picture_url != '' THEN 1 ELSE 0 END
            ) * 100.0 / 6
        ), 0)
        ELSE 50
    END as profile_completion_percentage

FROM user_profiles up

LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_courses,
        COUNT(*) FILTER (WHERE type = 'class') as active_courses,
        COUNT(*) FILTER (WHERE type = 'exam' AND exam_date >= CURRENT_DATE) as upcoming_exams,
        COUNT(*) FILTER (WHERE type = 'deadline' AND deadline_date >= CURRENT_DATE) as pending_deadlines
    FROM courses 
    GROUP BY user_id
) course_stats ON up.id = course_stats.user_id

LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_notifications,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_notifications,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_notifications
    FROM notifications 
    GROUP BY user_id
) notification_stats ON up.id = notification_stats.user_id;

-- Recreate the function
CREATE OR REPLACE FUNCTION get_user_statistics(user_uuid UUID)
RETURNS TABLE (
    courses_scheduled INTEGER,
    active_courses INTEGER,
    upcoming_events INTEGER,
    total_reminders INTEGER,
    login_streak INTEGER,
    profile_completion INTEGER
) AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = user_uuid) THEN
        RETURN QUERY
        SELECT 
            us.courses_scheduled::INTEGER,
            us.active_courses::INTEGER,
            (us.upcoming_exams + us.pending_deadlines)::INTEGER as upcoming_events,
            us.total_reminders::INTEGER,
            us.login_streak::INTEGER,
            us.profile_completion_percentage::INTEGER
        FROM user_statistics us
        WHERE us.id = user_uuid;
    ELSE
        RETURN QUERY
        SELECT 0, 0, 0, 0, 1, 50;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS if not already enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile" ON user_profiles
            FOR SELECT USING (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile" ON user_profiles
            FOR UPDATE USING (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' AND policyname = 'Users can insert their own profile'
    ) THEN
        CREATE POLICY "Users can insert their own profile" ON user_profiles
            FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

SELECT 'user_profiles table fully updated with all required columns!' as status;
SELECT count(*) as total_columns FROM information_schema.columns WHERE table_name = 'user_profiles';
