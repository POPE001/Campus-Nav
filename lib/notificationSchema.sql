-- ================================
-- Notifications Database Schema
-- ================================

-- ================================
-- Notifications Table
-- ================================
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
    notification_id TEXT NOT NULL, -- Expo notification ID
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('class_reminder', 'exam_reminder', 'deadline_reminder', 'custom')),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'delivered', 'cancelled', 'failed')),
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    delivered_at TIMESTAMP WITH TIME ZONE,
    data JSONB, -- Additional notification data (course info, venue, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- Notification Settings Table
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
-- Indexes for Performance
-- ================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_course_id ON notifications(course_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- ================================
-- Row Level Security (RLS) Policies
-- ================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications" ON notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Notification settings policies
CREATE POLICY "Users can view their own notification settings" ON notification_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" ON notification_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" ON notification_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification settings" ON notification_settings
    FOR DELETE USING (auth.uid() = user_id);

-- ================================
-- Triggers to Update updated_at
-- ================================
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- ================================
-- Example Usage
-- ================================
/*
-- Insert default settings for a user
INSERT INTO notification_settings (user_id) VALUES (auth.uid());

-- Schedule a notification
INSERT INTO notifications (
    id, user_id, course_id, notification_id, title, body, type, 
    scheduled_for, data
) VALUES (
    'notif_' || generate_random_uuid(),
    auth.uid(),
    'course_123',
    'expo_notif_id_456',
    'Class Reminder',
    'CSC 101 starts in 15 minutes',
    'class_reminder',
    NOW() + INTERVAL '15 minutes',
    '{"course_code": "CSC 101", "location": "Lab 1", "venue_id": "science"}'::jsonb
);

-- Get user's notification settings
SELECT * FROM notification_settings WHERE user_id = auth.uid();

-- Get upcoming notifications
SELECT * FROM notifications 
WHERE user_id = auth.uid() 
AND status = 'scheduled' 
AND scheduled_for > NOW()
ORDER BY scheduled_for ASC;

-- Clean up old notifications (run periodically)
SELECT cleanup_old_notifications();
*/
