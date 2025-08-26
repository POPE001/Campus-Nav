-- ================================
-- Complete Notification Setup with Push Token Support
-- This script creates all necessary notification tables and adds push token support
-- ================================

-- ================================
-- First: Create the update_updated_at function if it doesn't exist
-- ================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ================================
-- Create Notifications Table (if it doesn't exist)
-- ================================
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

-- ================================
-- Create Notification Settings Table (if it doesn't exist)
-- ================================
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
-- Create Indexes for Performance (if they don't exist)
-- ================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_course_id ON notifications(course_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- ================================
-- Enable Row Level Security (RLS)
-- ================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- ================================
-- RLS Policies for Notifications
-- ================================
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
    
    -- Create new policies
    CREATE POLICY "Users can view their own notifications" ON notifications
        FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own notifications" ON notifications
        FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own notifications" ON notifications
        FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own notifications" ON notifications
        FOR DELETE USING (auth.uid() = user_id);
END $$;

-- ================================
-- RLS Policies for Notification Settings
-- ================================
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own notification settings" ON notification_settings;
    DROP POLICY IF EXISTS "Users can insert their own notification settings" ON notification_settings;
    DROP POLICY IF EXISTS "Users can update their own notification settings" ON notification_settings;
    DROP POLICY IF EXISTS "Users can delete their own notification settings" ON notification_settings;
    
    -- Create new policies
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
-- Triggers to Update updated_at
-- ================================
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- Default Notification Settings Function
-- ================================
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

-- ================================
-- Cleanup Old Notifications Function
-- ================================
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
-- NOW ADD PUSH TOKEN SUPPORT
-- ================================

-- Add push_token column to user_profiles table (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'push_token') THEN
        ALTER TABLE user_profiles ADD COLUMN push_token TEXT;
        RAISE NOTICE 'Added push_token column to user_profiles';
    ELSE
        RAISE NOTICE 'push_token column already exists in user_profiles';
    END IF;
END $$;

-- Add push_token_updated_at column (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'push_token_updated_at') THEN
        ALTER TABLE user_profiles ADD COLUMN push_token_updated_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added push_token_updated_at column to user_profiles';
    ELSE
        RAISE NOTICE 'push_token_updated_at column already exists in user_profiles';
    END IF;
END $$;

-- Add index for push_token lookups (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_user_profiles_push_token ON user_profiles(push_token);

-- ================================
-- Push Token Management Functions
-- ================================

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

-- Function to clear invalid push tokens (when they expire or fail)
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

-- ================================
-- Grant Permissions
-- ================================
GRANT EXECUTE ON FUNCTION update_user_push_token(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_user_push_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_with_push_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications() TO authenticated;

-- ================================
-- Comments
-- ================================
COMMENT ON TABLE notifications IS 'Scheduled and delivered notifications for users';
COMMENT ON COLUMN notifications.notification_id IS 'Expo push notification ID for tracking';
COMMENT ON COLUMN notifications.type IS 'Type of notification for categorization';
COMMENT ON COLUMN notifications.status IS 'Current status of the notification';
COMMENT ON COLUMN notifications.data IS 'Additional data stored as JSON (course details, venue info, etc.)';

COMMENT ON TABLE notification_settings IS 'User preferences for notifications';
COMMENT ON COLUMN notification_settings.quiet_hours_start IS 'Start time for quiet hours (no notifications)';
COMMENT ON COLUMN notification_settings.quiet_hours_end IS 'End time for quiet hours';
COMMENT ON COLUMN notification_settings.weekend_notifications IS 'Whether to send notifications on weekends';

COMMENT ON COLUMN user_profiles.push_token IS 'Expo push notification token for the user device';
COMMENT ON COLUMN user_profiles.push_token_updated_at IS 'When the push token was last updated';

-- ================================
-- Success Message
-- ================================
SELECT 'Complete notification setup with push token support completed successfully!' as status;

