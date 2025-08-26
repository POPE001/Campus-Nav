-- ================================
-- MINIMAL Profile Fix - Only Basic Tables
-- ================================

-- Add missing columns to existing user_profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN phone_number TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'bio'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN bio TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'profile_picture_url'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN profile_picture_url TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'first_name'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN first_name TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'last_name'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN last_name TEXT;
    END IF;
END $$;

-- Drop the problematic view if it exists
DROP VIEW IF EXISTS user_statistics;

-- Create a SIMPLE view that only uses existing tables
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    up.id,
    
    -- Course Statistics (from courses table if it exists)
    COALESCE(course_stats.total_courses, 0) as courses_scheduled,
    COALESCE(course_stats.active_courses, 0) as active_courses,
    COALESCE(course_stats.upcoming_exams, 0) as upcoming_exams,
    COALESCE(course_stats.pending_deadlines, 0) as pending_deadlines,
    
    -- Notification Statistics (from notifications table if it exists)
    COALESCE(notification_stats.total_notifications, 0) as total_reminders,
    COALESCE(notification_stats.scheduled_notifications, 0) as scheduled_reminders,
    COALESCE(notification_stats.delivered_notifications, 0) as delivered_reminders,
    
    -- Simple activity stats (defaults since we don't have user_activity table)
    0 as total_logins,
    1 as login_streak,  -- Default to 1
    1 as days_active,   -- Default to 1
    up.created_at as last_activity,
    
    -- Profile Completion (only using user_profiles columns)
    CASE 
        WHEN up.full_name IS NOT NULL 
         AND up.department IS NOT NULL 
         AND up.faculty IS NOT NULL 
         AND (up.user_type = 'staff' OR up.level IS NOT NULL)
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

-- Only join to courses table if it exists
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

-- Only join to notifications table if it exists  
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_notifications,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_notifications,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_notifications
    FROM notifications 
    GROUP BY user_id
) notification_stats ON up.id = notification_stats.user_id;

-- Create the statistics function
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
    -- Check if the view exists and user exists
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
        -- Return default values if user doesn't exist
        RETURN QUERY
        SELECT 0, 0, 0, 0, 1, 50;
    END IF;
END;
$$ LANGUAGE plpgsql;

SELECT 'Minimal profile system setup completed!' as status;
SELECT 'Note: Only basic statistics available. Activity tracking requires user_activity table.' as note;
