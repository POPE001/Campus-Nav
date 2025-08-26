-- ================================
-- COMPLETE SCHEMA FIX
-- Fix user_profiles table and content publishing
-- ================================

-- 1. Drop existing incomplete user_profiles table
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS user_activity CASCADE; 
DROP TABLE IF EXISTS user_preferences CASCADE;

-- 2. Create complete user_profiles table with all expected columns
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
    student_id TEXT,
    staff_id TEXT,
    department TEXT,
    faculty TEXT,
    level TEXT,
    position TEXT, -- For staff
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
    show_email BOOLEAN DEFAULT false,
    show_department BOOLEAN DEFAULT true,
    public_profile BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    profile_completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Create user_activity table
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create user_preferences table  
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    dark_mode BOOLEAN DEFAULT false,
    language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_type ON user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_faculty ON user_profiles(faculty);
CREATE INDEX IF NOT EXISTS idx_user_profiles_department ON user_profiles(department);
CREATE INDEX IF NOT EXISTS idx_user_profiles_level ON user_profiles(level);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at);

-- 6. Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can view their own activity" ON user_activity
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- 8. Create your user profile from auth metadata
INSERT INTO user_profiles (
    id,
    email,
    first_name,
    last_name,
    user_type,
    email_verified,
    profile_completed,
    created_at,
    updated_at
) VALUES (
    '5f0267e3-7663-4b16-b818-481e8e2c2497',
    'adeonioluwamayowa@gmail.com',
    'Mayowa', 
    'Adeoni',
    'staff',
    true,
    false,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    user_type = EXCLUDED.user_type,
    email_verified = EXCLUDED.email_verified,
    updated_at = NOW();

-- 9. Create default preferences
INSERT INTO user_preferences (user_id)
VALUES ('5f0267e3-7663-4b16-b818-481e8e2c2497')
ON CONFLICT (user_id) DO NOTHING;

-- 10. Fix the notification trigger to be more robust
CREATE OR REPLACE FUNCTION send_content_notifications()
RETURNS TRIGGER AS $$
DECLARE
    targeting_record RECORD;
    user_record RECORD;
    notification_title TEXT;
    notification_message TEXT;
BEGIN
    -- Only process when content is published
    IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
        
        -- Prepare notification content
        notification_title := CASE NEW.type
            WHEN 'event' THEN '📅 New Event: ' || NEW.title
            WHEN 'announcement' THEN '📢 Announcement: ' || NEW.title
            WHEN 'blog' THEN '📝 New Blog Post: ' || NEW.title
            ELSE '📰 New Article: ' || NEW.title
        END;
        
        notification_message := COALESCE(NEW.excerpt, LEFT(NEW.content, 100) || '...');
        
        -- Loop through all targeting rules for this content
        FOR targeting_record IN 
            SELECT * FROM content_targeting WHERE content_id = NEW.id
        LOOP
            -- Find users who match this targeting rule
            FOR user_record IN
                SELECT DISTINCT u.id
                FROM auth.users u
                LEFT JOIN user_profiles up ON u.id = up.id
                WHERE (
                    -- Everyone
                    targeting_record.target_type = 'everyone'
                    OR
                    -- Students
                    (targeting_record.target_type = 'students' AND 
                     (up.user_type = 'student' OR u.raw_user_meta_data->>'user_type' = 'student'))
                    OR
                    -- Staff  
                    (targeting_record.target_type = 'staff' AND 
                     (up.user_type = 'staff' OR u.raw_user_meta_data->>'user_type' = 'staff'))
                    OR
                    -- Faculty
                    (targeting_record.target_type = 'faculty' AND 
                     (up.faculty = targeting_record.faculty OR u.raw_user_meta_data->>'faculty' = targeting_record.faculty))
                    OR
                    -- Department
                    (targeting_record.target_type = 'department' AND 
                     (up.department = targeting_record.department OR u.raw_user_meta_data->>'department' = targeting_record.department))
                    OR
                    -- Level
                    (targeting_record.target_type = 'level' AND 
                     (up.level = targeting_record.level OR u.raw_user_meta_data->>'level' = targeting_record.level))
                )
            LOOP
                -- Insert notification (ignore duplicates)
                INSERT INTO content_notifications (
                    content_id,
                    user_id,
                    title,
                    message,
                    notification_type
                ) VALUES (
                    NEW.id,
                    user_record.id,
                    notification_title,
                    notification_message,
                    CASE WHEN NEW.priority = 'urgent' THEN 'urgent' 
                         WHEN NEW.type = 'event' THEN 'event'
                         ELSE 'content' END
                ) ON CONFLICT (content_id, user_id) DO NOTHING;
                
            END LOOP;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Recreate the trigger
DROP TRIGGER IF EXISTS content_notification_trigger ON content;
CREATE TRIGGER content_notification_trigger
    AFTER INSERT OR UPDATE ON content
    FOR EACH ROW
    EXECUTE FUNCTION send_content_notifications();

-- 12. Create function for user statistics (fixes the profile screen error)
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
        FROM content_notifications 
        WHERE user_id = user_uuid
        GROUP BY user_id
    ) notification_count ON up.id = notification_count.user_id
    
    LEFT JOIN (
        SELECT 
            id,
            CASE 
                WHEN first_name IS NOT NULL AND last_name IS NOT NULL AND email IS NOT NULL THEN 75
                WHEN first_name IS NOT NULL AND email IS NOT NULL THEN 50
                ELSE 25
            END as completion_pct
        FROM user_profiles
        WHERE id = user_uuid
    ) profile_completion ON up.id = profile_completion.id
    
    WHERE up.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Complete schema fix completed successfully!' as status;
SELECT 'User profile created for your account' as note;
SELECT 'Content publishing should now work' as result;
