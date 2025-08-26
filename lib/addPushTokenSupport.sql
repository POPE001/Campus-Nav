-- ================================
-- Add Push Token Support for Push Notifications
-- ================================

-- Add push_token column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Add index for push_token lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_push_token ON user_profiles(push_token);

-- Add push_token_updated_at to track when token was last updated
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMP WITH TIME ZONE;

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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_user_push_token(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_user_push_token(UUID) TO authenticated;

-- Update the notification table to include content notifications
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('class_reminder', 'exam_reminder', 'deadline_reminder', 'content_notification', 'custom'));

SELECT 'Push token support added successfully!' as status;
