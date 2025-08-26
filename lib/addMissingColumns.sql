-- ================================
-- Add Missing Columns to user_profiles Table
-- ================================

-- Add phone_number column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN phone_number TEXT;
    END IF;
END $$;

-- Add bio column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'bio'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN bio TEXT;
    END IF;
END $$;

-- Add profile_picture_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'profile_picture_url'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN profile_picture_url TEXT;
    END IF;
END $$;

-- Add other commonly missing columns
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

-- Recreate the view with safer column references
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
    
    -- Activity Statistics
    COALESCE(activity_stats.login_count, 0) as total_logins,
    COALESCE(activity_stats.current_streak, 0) as login_streak,
    COALESCE(activity_stats.days_active, 0) as days_active,
    activity_stats.last_activity,
    
    -- Profile Completion (Safe calculation that only references existing columns)
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
) notification_stats ON up.id = notification_stats.user_id

LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) FILTER (WHERE activity_type = 'login') as login_count,
        COUNT(DISTINCT DATE(created_at)) as days_active,
        MAX(created_at) as last_activity,
        -- Calculate login streak (simplified - consecutive days with login)
        COALESCE((
            SELECT COUNT(*)
            FROM (
                SELECT DATE(created_at) as login_date
                FROM user_activity ua2 
                WHERE ua2.user_id = ua.user_id 
                AND ua2.activity_type = 'login'
                AND ua2.created_at >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY DATE(created_at)
                ORDER BY login_date DESC
            ) recent_logins
        ), 1) as current_streak
    FROM user_activity ua
    GROUP BY user_id
) activity_stats ON up.id = activity_stats.user_id;

-- Update the RPC function to handle the corrected view
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
END;
$$ LANGUAGE plpgsql;

SELECT 'Missing columns added and view recreated successfully!' as status;
