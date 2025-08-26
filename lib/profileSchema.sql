-- ================================
-- User Profiles Database Schema
-- ================================

-- ================================
-- User Profiles Table (Extended Profile Info)
-- ================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    user_type TEXT NOT NULL CHECK (user_type IN ('student', 'staff')) DEFAULT 'student',
    
    -- Academic Information
    student_id TEXT UNIQUE, -- For students (e.g., "STU/2023/001")
    staff_id TEXT UNIQUE,   -- For staff (e.g., "STF/2020/045")
    department TEXT,
    faculty TEXT,
    level TEXT,             -- For students (e.g., "100", "200", "300", "400")
    cgpa DECIMAL(3,2),      -- For students (0.00 - 4.00)
    
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

-- ================================
-- User Activity Tracking Table
-- ================================
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'login', 'logout', 'course_added', 'course_updated', 'course_deleted',
        'notification_scheduled', 'notification_cancelled', 'venue_searched',
        'map_navigation', 'profile_updated', 'settings_changed'
    )),
    activity_data JSONB, -- Additional activity metadata
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- User Preferences Table
-- ================================
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
    week_start_day INTEGER DEFAULT 1 CHECK (week_start_day BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday
    default_view TEXT DEFAULT 'week' CHECK (default_view IN ('day', 'week', 'month')),
    show_time_conflicts BOOLEAN DEFAULT true,
    
    -- Privacy Preferences
    analytics_consent BOOLEAN DEFAULT false,
    crash_reporting_consent BOOLEAN DEFAULT true,
    marketing_consent BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- User Statistics View (Computed)
-- ================================
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
    
    -- Profile Completion
    CASE 
        WHEN up.full_name IS NOT NULL 
         AND up.department IS NOT NULL 
         AND up.faculty IS NOT NULL 
         AND (up.user_type = 'staff' OR up.level IS NOT NULL)
        THEN ROUND((
            (CASE WHEN up.full_name IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN up.department IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN up.faculty IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN up.phone_number IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN up.bio IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN up.profile_picture_url IS NOT NULL THEN 1 ELSE 0 END
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
        ), 0) as current_streak
    FROM user_activity ua
    GROUP BY user_id
) activity_stats ON up.id = activity_stats.user_id;

-- ================================
-- Indexes for Performance
-- ================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_type ON user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_department ON user_profiles(department);
CREATE INDEX IF NOT EXISTS idx_user_profiles_faculty ON user_profiles(faculty);
CREATE INDEX IF NOT EXISTS idx_user_profiles_student_id ON user_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_staff_id ON user_profiles(staff_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_type ON user_activity(user_id, activity_type);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ================================
-- Row Level Security (RLS) Policies
-- ================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- User Profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Public profiles can be viewed by anyone (if enabled)
CREATE POLICY "Public profiles viewable by authenticated users" ON user_profiles
    FOR SELECT USING (
        public_profile = true 
        AND is_active = true 
        AND auth.role() = 'authenticated'
    );

-- User Activity policies
CREATE POLICY "Users can view their own activity" ON user_activity
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity" ON user_activity
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Preferences policies
CREATE POLICY "Users can manage their own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- ================================
-- Triggers to Update updated_at
-- ================================
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- Functions for Profile Management
-- ================================

-- Function to create default profile and preferences for new users
CREATE OR REPLACE FUNCTION create_user_profile_and_preferences()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default profile
    INSERT INTO user_profiles (
        id, email, full_name, user_type, created_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'user_type', 'student'),
        NOW()
    ) ON CONFLICT (id) DO NOTHING;

    -- Create default preferences
    INSERT INTO user_preferences (user_id) 
    VALUES (NEW.id) 
    ON CONFLICT (user_id) DO NOTHING;

    -- Log signup activity
    INSERT INTO user_activity (user_id, activity_type, activity_data)
    VALUES (NEW.id, 'login', jsonb_build_object(
        'event', 'first_signup',
        'provider', COALESCE(NEW.raw_app_meta_data->>'provider', 'google')
    ));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create profile on user signup
CREATE TRIGGER create_user_profile_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile_and_preferences();

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    user_uuid UUID,
    activity_type_param TEXT,
    activity_data_param JSONB DEFAULT NULL,
    ip_address_param INET DEFAULT NULL,
    user_agent_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO user_activity (
        user_id, activity_type, activity_data, ip_address, user_agent
    ) VALUES (
        user_uuid, activity_type_param, activity_data_param, ip_address_param, user_agent_param
    ) RETURNING id INTO activity_id;
    
    -- Update last_login_at for login activities
    IF activity_type_param = 'login' THEN
        UPDATE user_profiles 
        SET last_login_at = NOW()
        WHERE id = user_uuid;
    END IF;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user statistics
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

-- ================================
-- Sample Data for Testing (Optional)
-- ================================
/*
-- Example: Update a user profile
UPDATE user_profiles SET
    full_name = 'John Doe',
    first_name = 'John',
    last_name = 'Doe',
    department = 'Computer Science',
    faculty = 'Science',
    level = '300',
    student_id = 'STU/2023/001',
    phone_number = '+234801234567',
    bio = 'Computer Science student passionate about software development',
    profile_completed = true,
    profile_completed_at = NOW()
WHERE id = auth.uid();

-- Example: Log user activity
SELECT log_user_activity(
    auth.uid(),
    'course_added',
    '{"course_id": "course_123", "course_name": "Data Structures"}'::jsonb
);

-- Example: Get user statistics
SELECT * FROM get_user_statistics(auth.uid());
*/

-- ================================
-- Comments
-- ================================
COMMENT ON TABLE user_profiles IS 'Extended user profile information beyond basic auth data';
COMMENT ON TABLE user_activity IS 'User activity tracking for analytics and engagement';
COMMENT ON TABLE user_preferences IS 'User preferences for app customization';
COMMENT ON VIEW user_statistics IS 'Computed view of user statistics and metrics';

COMMENT ON COLUMN user_profiles.student_id IS 'Unique student identifier (e.g., STU/2023/001)';
COMMENT ON COLUMN user_profiles.staff_id IS 'Unique staff identifier (e.g., STF/2020/045)';
COMMENT ON COLUMN user_profiles.cgpa IS 'Cumulative Grade Point Average for students (0.00-4.00)';
COMMENT ON COLUMN user_profiles.profile_completed IS 'Whether user has completed their profile setup';

COMMENT ON COLUMN user_activity.activity_type IS 'Type of activity performed by the user';
COMMENT ON COLUMN user_activity.activity_data IS 'Additional metadata about the activity';

COMMENT ON COLUMN user_preferences.theme IS 'App theme preference (light, dark, system)';
COMMENT ON COLUMN user_preferences.language IS 'User interface language preference';
COMMENT ON COLUMN user_preferences.week_start_day IS 'Day of week to start calendar (0=Sunday, 1=Monday)';
