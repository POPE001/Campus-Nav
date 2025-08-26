-- Fix the send_content_notifications function to properly cast JSONB
-- This resolves the "operator does not exist: record ->> unknown" error

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
                WHERE user_matches_targeting(
                    u.id,
                    targeting_record.target_type,
                    targeting_record.faculty,
                    targeting_record.department,
                    targeting_record.level,
                    targeting_record.user_type,
                    targeting_record.custom_users::JSONB  -- Explicit JSONB cast fixes the error
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS content_notification_trigger ON content;

CREATE TRIGGER content_notification_trigger
    AFTER INSERT OR UPDATE ON content
    FOR EACH ROW
    EXECUTE FUNCTION send_content_notifications();

SELECT 'Notification trigger fixed successfully!' as status;

