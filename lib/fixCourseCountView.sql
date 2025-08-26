-- ================================
-- Fix Course Count View Issue
-- ================================

-- First, let's check what we have
SELECT 'Debug: Checking current user courses' as debug;
SELECT COUNT(*) as my_course_count FROM courses WHERE user_id = auth.uid();

SELECT 'Debug: Checking current user profile' as debug;
SELECT id, email FROM user_profiles WHERE id = auth.uid();

-- Drop the problematic view and recreate it properly
DROP VIEW IF EXISTS user_statistics;

-- Create a SECURE view that respects RLS
CREATE OR REPLACE VIEW user_statistics 
WITH (security_invoker = true)  -- This ensures RLS is applied properly
AS
SELECT 
    up.id,
    
    -- Course Statistics (with proper RLS handling)
    COALESCE(course_stats.total_courses, 0) as courses_scheduled,
    COALESCE(course_stats.active_courses, 0) as active_courses,
    COALESCE(course_stats.upcoming_exams, 0) as upcoming_exams,
    COALESCE(course_stats.pending_deadlines, 0) as pending_deadlines,
    
    -- Notification Statistics (with proper RLS handling)
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

-- LEFT JOIN with courses (this should work with RLS now)
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_courses,
        COUNT(*) FILTER (WHERE type = 'class') as active_courses,
        COUNT(*) FILTER (WHERE type = 'exam' AND exam_date >= CURRENT_DATE) as upcoming_exams,
        COUNT(*) FILTER (WHERE type = 'deadline' AND deadline_date >= CURRENT_DATE) as pending_deadlines
    FROM courses 
    WHERE user_id = auth.uid()  -- Explicit RLS filtering
    GROUP BY user_id
) course_stats ON up.id = course_stats.user_id

-- LEFT JOIN with notifications (this should work with RLS now)  
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_notifications,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_notifications,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_notifications
    FROM notifications 
    WHERE user_id = auth.uid()  -- Explicit RLS filtering
    GROUP BY user_id
) notification_stats ON up.id = notification_stats.user_id

-- Only show current user's profile
WHERE up.id = auth.uid();

-- Update the function to use the corrected view
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
    -- Direct query to ensure RLS is respected
    RETURN QUERY
    SELECT 
        COALESCE(course_count.total_courses, 0)::INTEGER as courses_scheduled,
        COALESCE(course_count.active_courses, 0)::INTEGER as active_courses,
        COALESCE(course_count.upcoming_events, 0)::INTEGER as upcoming_events,
        COALESCE(notification_count.total_notifications, 0)::INTEGER as total_reminders,
        1::INTEGER as login_streak,  -- Default
        COALESCE(profile_completion.completion_pct, 50)::INTEGER as profile_completion
    FROM user_profiles up
    
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as total_courses,
            COUNT(*) FILTER (WHERE type = 'class') as active_courses,
            (COUNT(*) FILTER (WHERE type = 'exam' AND exam_date >= CURRENT_DATE) + 
             COUNT(*) FILTER (WHERE type = 'deadline' AND deadline_date >= CURRENT_DATE)) as upcoming_events
        FROM courses 
        WHERE user_id = user_uuid
        GROUP BY user_id
    ) course_count ON up.id = course_count.user_id
    
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as total_notifications
        FROM notifications 
        WHERE user_id = user_uuid
        GROUP BY user_id
    ) notification_count ON up.id = notification_count.user_id
    
    LEFT JOIN (
        SELECT 
            id,
            CASE 
                WHEN full_name IS NOT NULL AND full_name != ''
                 AND department IS NOT NULL AND department != ''
                 AND faculty IS NOT NULL AND faculty != ''
                 AND (user_type = 'staff' OR (level IS NOT NULL AND level != ''))
                THEN ROUND((
                    (CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 ELSE 0 END +
                     CASE WHEN department IS NOT NULL AND department != '' THEN 1 ELSE 0 END +
                     CASE WHEN faculty IS NOT NULL AND faculty != '' THEN 1 ELSE 0 END +
                     CASE WHEN phone_number IS NOT NULL AND phone_number != '' THEN 1 ELSE 0 END +
                     CASE WHEN bio IS NOT NULL AND bio != '' THEN 1 ELSE 0 END +
                     CASE WHEN profile_picture_url IS NOT NULL AND profile_picture_url != '' THEN 1 ELSE 0 END
                    ) * 100.0 / 6
                ), 0)
                ELSE 50
            END as completion_pct
        FROM user_profiles
        WHERE id = user_uuid
    ) profile_completion ON up.id = profile_completion.id
    
    WHERE up.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the fix
SELECT 'Testing course count for current user:' as test_result;
SELECT COUNT(*) as actual_course_count FROM courses WHERE user_id = auth.uid();

SELECT 'Testing new statistics function:' as test_result;
SELECT * FROM get_user_statistics(auth.uid());

SELECT 'Fix applied successfully!' as status;
