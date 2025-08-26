-- ================================
-- MASTER DATABASE SETUP SCRIPT
-- Creates all tables in correct dependency order
-- ================================

-- This script creates the complete database schema for the Campus Navigation app
-- Run this script in your Supabase SQL Editor to set up everything

-- ================================
-- STEP 1: Utility Functions
-- ================================

-- Create the update_updated_at function (used by multiple tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ================================
-- STEP 2: USER PROFILES TABLE
-- ================================
-- Create user_profiles table if it doesn't exist
-- This table may already exist from previous setups

CREATE TABLE IF NOT EXISTS user_profiles (
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
    
    -- Push Notification Support (Add these columns if they don't exist)
    push_token TEXT,
    push_token_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add push token columns if they don't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'push_token') THEN
        ALTER TABLE user_profiles ADD COLUMN push_token TEXT;
        RAISE NOTICE 'Added push_token column to user_profiles';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'push_token_updated_at') THEN
        ALTER TABLE user_profiles ADD COLUMN push_token_updated_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added push_token_updated_at column to user_profiles';
    END IF;
END $$;

-- ================================
-- STEP 3: COURSES TABLE
-- ================================
-- Create courses table (depends only on auth.users)

CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    code TEXT NOT NULL,
    instructor TEXT NOT NULL,
    location TEXT NOT NULL,
    venue_id TEXT, -- References venues from constants/Venues.ts
    day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
    start_time TEXT NOT NULL, -- Format: 'HH:MM' (24-hour)
    end_time TEXT NOT NULL,   -- Format: 'HH:MM' (24-hour)
    color TEXT NOT NULL,      -- Hex color code
    type TEXT NOT NULL CHECK (type IN ('class', 'exam', 'deadline')),
    description TEXT,
    reminder_enabled BOOLEAN DEFAULT true,
    reminder_minutes INTEGER DEFAULT 15,
    exam_date DATE,           -- For exam type courses
    deadline_date DATE,       -- For deadline type courses
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- STEP 4: NOTIFICATIONS TABLES
-- ================================
-- Create notifications table (depends on courses table)

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
    notification_id TEXT NOT NULL, -- Expo notification ID
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('class_reminder', 'exam_reminder', 'deadline_reminder', 'content_notification', 'custom')),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'delivered', 'cancelled', 'failed')),
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    delivered_at TIMESTAMP WITH TIME ZONE,
    data JSONB, -- Additional notification data (course info, venue, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    class_reminders_enabled BOOLEAN DEFAULT true,
    exam_reminders_enabled BOOLEAN DEFAULT true,
    deadline_reminders_enabled BOOLEAN DEFAULT true,
    default_reminder_minutes INTEGER DEFAULT 15,
    quiet_hours_start TIME, -- e.g., '22:00'
    quiet_hours_end TIME,   -- e.g., '07:00'
    weekend_notifications BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- STEP 5: INDEXES FOR PERFORMANCE
-- ================================

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_type ON user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_department ON user_profiles(department);
CREATE INDEX IF NOT EXISTS idx_user_profiles_faculty ON user_profiles(faculty);
CREATE INDEX IF NOT EXISTS idx_user_profiles_student_id ON user_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_staff_id ON user_profiles(staff_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_push_token ON user_profiles(push_token);

-- Courses indexes
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_day ON courses(day);
CREATE INDEX IF NOT EXISTS idx_courses_user_day ON courses(user_id, day);
CREATE INDEX IF NOT EXISTS idx_courses_type ON courses(type);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_course_id ON notifications(course_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- ================================
-- STEP 6: ROW LEVEL SECURITY (RLS)
-- ================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- User Profiles RLS Policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
    
    CREATE POLICY "Users can view their own profile" ON user_profiles
        FOR SELECT USING (auth.uid() = id);

    CREATE POLICY "Users can update their own profile" ON user_profiles
        FOR UPDATE USING (auth.uid() = id);

    CREATE POLICY "Users can insert their own profile" ON user_profiles
        FOR INSERT WITH CHECK (auth.uid() = id);
END $$;

-- Courses RLS Policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own courses" ON courses;
    DROP POLICY IF EXISTS "Users can insert their own courses" ON courses;
    DROP POLICY IF EXISTS "Users can update their own courses" ON courses;
    DROP POLICY IF EXISTS "Users can delete their own courses" ON courses;
    
    CREATE POLICY "Users can view their own courses" ON courses
        FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own courses" ON courses
        FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own courses" ON courses
        FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own courses" ON courses
        FOR DELETE USING (auth.uid() = user_id);
END $$;

-- Notifications RLS Policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
    
    CREATE POLICY "Users can view their own notifications" ON notifications
        FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own notifications" ON notifications
        FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own notifications" ON notifications
        FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own notifications" ON notifications
        FOR DELETE USING (auth.uid() = user_id);
END $$;

-- Notification Settings RLS Policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own notification settings" ON notification_settings;
    DROP POLICY IF EXISTS "Users can insert their own notification settings" ON notification_settings;
    DROP POLICY IF EXISTS "Users can update their own notification settings" ON notification_settings;
    DROP POLICY IF EXISTS "Users can delete their own notification settings" ON notification_settings;
    
    CREATE POLICY "Users can view their own notification settings" ON notification_settings
        FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own notification settings" ON notification_settings
        FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own notification settings" ON notification_settings
        FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own notification settings" ON notification_settings
        FOR DELETE USING (auth.uid() = user_id);
END $$;

-- ================================
-- STEP 7: TRIGGERS
-- ================================

-- Update triggers for updated_at columns
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- STEP 8: HELPER FUNCTIONS
-- ================================

-- Function to create default notification settings for new users
CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default settings for new users
DROP TRIGGER IF EXISTS create_user_notification_settings ON auth.users;
CREATE TRIGGER create_user_notification_settings
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_notification_settings();

-- Function to update user's push token
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

-- Function to clear invalid push tokens
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

-- Function to get users with valid push tokens
CREATE OR REPLACE FUNCTION get_users_with_push_tokens()
RETURNS TABLE(user_id UUID, push_token TEXT, push_token_updated_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
    RETURN QUERY
    SELECT up.id, up.push_token, up.push_token_updated_at
    FROM user_profiles up
    WHERE up.push_token IS NOT NULL 
    AND up.push_token != '';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    -- Delete delivered notifications older than 30 days
    DELETE FROM notifications 
    WHERE status = 'delivered' 
    AND delivered_at < NOW() - INTERVAL '30 days';
    
    -- Delete cancelled/failed notifications older than 7 days
    DELETE FROM notifications 
    WHERE status IN ('cancelled', 'failed') 
    AND updated_at < NOW() - INTERVAL '7 days';
    
    -- Mark scheduled notifications as failed if they're more than 1 hour past scheduled time
    UPDATE notifications 
    SET status = 'failed', updated_at = NOW()
    WHERE status = 'scheduled' 
    AND scheduled_for < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- ================================
-- STEP 9: GRANT PERMISSIONS
-- ================================

GRANT EXECUTE ON FUNCTION update_user_push_token(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_user_push_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_with_push_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications() TO authenticated;

-- ================================
-- STEP 10: TABLE COMMENTS
-- ================================

COMMENT ON TABLE user_profiles IS 'Extended user profile information and settings';
COMMENT ON TABLE courses IS 'User course schedules and timetables';
COMMENT ON TABLE notifications IS 'Scheduled and delivered notifications for users';
COMMENT ON TABLE notification_settings IS 'User preferences for notifications';

COMMENT ON COLUMN user_profiles.push_token IS 'Expo push notification token for the user device';
COMMENT ON COLUMN user_profiles.push_token_updated_at IS 'When the push token was last updated';
COMMENT ON COLUMN notifications.notification_id IS 'Expo push notification ID for tracking';
COMMENT ON COLUMN notifications.type IS 'Type of notification for categorization';
COMMENT ON COLUMN notifications.status IS 'Current status of the notification';
COMMENT ON COLUMN notifications.data IS 'Additional data stored as JSON (course details, venue info, etc.)';

-- ================================
-- SUCCESS MESSAGE
-- ================================
SELECT 'Master database setup completed successfully! All tables, indexes, RLS policies, and functions created.' as status;

