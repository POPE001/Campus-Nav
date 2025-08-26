-- ================================
-- Add Push Token Support for Push Notifications (FIXED VERSION)
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
-- First, find and drop any existing type constraint
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name for the type column
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc 
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'notifications' 
    AND ccu.column_name = 'type' 
    AND tc.constraint_type = 'CHECK';
    
    -- Drop the constraint if it exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE notifications DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped existing constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No existing type constraint found on notifications table';
    END IF;
END $$;

-- Add the new constraint with content_notification type
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('class_reminder', 'exam_reminder', 'deadline_reminder', 'content_notification', 'custom'));

RAISE NOTICE 'Added new type constraint with content_notification support';

SELECT 'Push token support added successfully!' as status;

