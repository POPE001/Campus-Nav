-- ================================
-- Content Management System Schema
-- ================================
-- 
-- SAFE TO RUN MULTIPLE TIMES:
-- - Tables: Created with IF NOT EXISTS
-- - Indexes: Created with IF NOT EXISTS  
-- - Functions: Created with OR REPLACE
-- - Policies: Dropped first, then recreated
-- - Triggers: Dropped first, then recreated
-- ================================

-- ================================
-- Content Table (Articles, Blogs, Events)
-- ================================
CREATE TABLE IF NOT EXISTS content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT, -- Short summary for previews
    type TEXT NOT NULL CHECK (type IN ('article', 'blog', 'event', 'announcement')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    
    -- Author information
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_role TEXT, -- Department, position, etc.
    
    -- Event-specific fields
    event_date TIMESTAMP WITH TIME ZONE,
    event_location TEXT,
    event_end_date TIMESTAMP WITH TIME ZONE,
    
    -- Media
    image_url TEXT,
    attachment_url TEXT,
    
    -- Metadata
    tags TEXT[], -- Array of tags for categorization
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

-- ================================
-- Content Targeting Table
-- ================================
CREATE TABLE IF NOT EXISTS content_targeting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    
    -- Audience targeting options
    target_type TEXT NOT NULL CHECK (target_type IN ('everyone', 'students', 'staff', 'faculty', 'department', 'level', 'custom')),
    
    -- Specific targeting values
    faculty TEXT, -- For faculty-specific content
    department TEXT, -- For department-specific content
    level TEXT, -- For level-specific content (100, 200, 300, 400)
    user_type TEXT, -- 'student', 'staff', 'visitor'
    
    -- Custom targeting (JSON array of user IDs)
    custom_users JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- Content Notifications Table
-- ================================
CREATE TABLE IF NOT EXISTS content_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notification details
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT DEFAULT 'content' CHECK (notification_type IN ('content', 'event', 'urgent')),
    
    -- Status tracking
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    
    -- Delivery status
    delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')),
    
    UNIQUE(content_id, user_id) -- Prevent duplicate notifications
);

-- ================================
-- Content Views/Interactions Table
-- ================================
CREATE TABLE IF NOT EXISTS content_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Allow anonymous views
    
    -- Interaction types
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'like', 'share', 'comment')),
    
    -- Metadata
    user_agent TEXT,
    ip_address INET,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(content_id, user_id, interaction_type) -- Prevent duplicate interactions per user
);

-- ================================
-- Indexes for Performance
-- ================================
-- Note: Using IF NOT EXISTS to safely create indexes
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_author ON content(author_id);
CREATE INDEX IF NOT EXISTS idx_content_published_at ON content(published_at);
CREATE INDEX IF NOT EXISTS idx_content_tags ON content USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_content_targeting_content ON content_targeting(content_id);
CREATE INDEX IF NOT EXISTS idx_content_targeting_type ON content_targeting(target_type);
CREATE INDEX IF NOT EXISTS idx_content_targeting_faculty ON content_targeting(faculty);
CREATE INDEX IF NOT EXISTS idx_content_targeting_department ON content_targeting(department);

CREATE INDEX IF NOT EXISTS idx_content_notifications_user ON content_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_content_notifications_content ON content_notifications(content_id);
CREATE INDEX IF NOT EXISTS idx_content_notifications_read ON content_notifications(read_at);

CREATE INDEX IF NOT EXISTS idx_content_interactions_content ON content_interactions(content_id);
CREATE INDEX IF NOT EXISTS idx_content_interactions_user ON content_interactions(user_id);

-- ================================
-- Row Level Security (RLS) Policies
-- ================================
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_targeting ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_interactions ENABLE ROW LEVEL SECURITY;

-- Content policies (drop existing ones first)
DROP POLICY IF EXISTS "Anyone can view published content" ON content;
DROP POLICY IF EXISTS "Staff can manage their own content" ON content;

CREATE POLICY "Anyone can view published content" ON content
    FOR SELECT USING (status = 'published');

CREATE POLICY "Staff can manage their own content" ON content
    FOR ALL USING (auth.uid() = author_id);

-- Targeting policies (drop existing ones first)
DROP POLICY IF EXISTS "Staff can manage targeting for their content" ON content_targeting;

CREATE POLICY "Staff can manage targeting for their content" ON content_targeting
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM content 
            WHERE content.id = content_targeting.content_id 
            AND content.author_id = auth.uid()
        )
    );

-- Notification policies (drop existing ones first)
DROP POLICY IF EXISTS "Users can view their own notifications" ON content_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON content_notifications;

CREATE POLICY "Users can view their own notifications" ON content_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON content_notifications
    FOR INSERT WITH CHECK (true);

-- Interaction policies (drop existing ones first)
DROP POLICY IF EXISTS "Users can view and create interactions" ON content_interactions;

CREATE POLICY "Users can view and create interactions" ON content_interactions
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- ================================
-- Functions for Content Management
-- ================================

-- Function to check if user should receive content based on targeting
CREATE OR REPLACE FUNCTION user_matches_targeting(
    user_uuid UUID,
    target_type TEXT,
    faculty_filter TEXT DEFAULT NULL,
    department_filter TEXT DEFAULT NULL,
    level_filter TEXT DEFAULT NULL,
    user_type_filter TEXT DEFAULT NULL,
    custom_users_filter JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    user_profile RECORD;
    auth_user RECORD;
BEGIN
    -- Get user profile and metadata
    SELECT * INTO user_profile
    FROM user_profiles
    WHERE id = user_uuid;
    
    SELECT * INTO auth_user
    FROM auth.users
    WHERE id = user_uuid;
    
    -- Check targeting logic
    CASE target_type
        WHEN 'everyone' THEN
            RETURN TRUE;
            
        WHEN 'students' THEN
            RETURN COALESCE(user_profile.user_type, auth_user.user_metadata->>'user_type') = 'student';
            
        WHEN 'staff' THEN
            RETURN COALESCE(user_profile.user_type, auth_user.user_metadata->>'user_type') = 'staff';
            
        WHEN 'faculty' THEN
            RETURN user_profile.faculty = faculty_filter OR auth_user.user_metadata->>'faculty' = faculty_filter;
            
        WHEN 'department' THEN
            RETURN user_profile.department = department_filter OR auth_user.user_metadata->>'department' = department_filter;
            
        WHEN 'level' THEN
            RETURN user_profile.level = level_filter OR auth_user.user_metadata->>'level' = level_filter;
            
        WHEN 'custom' THEN
            RETURN custom_users_filter ? user_uuid::TEXT;
            
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send notifications for published content
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
                    targeting_record.custom_users::JSONB
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

-- Trigger to automatically send notifications when content is published (drop existing first)
DROP TRIGGER IF EXISTS content_notification_trigger ON content;

CREATE TRIGGER content_notification_trigger
    AFTER INSERT OR UPDATE ON content
    FOR EACH ROW
    EXECUTE FUNCTION send_content_notifications();

-- ================================
-- Sample Data for Testing
-- ================================

-- Sample content (will be created by staff through the app)
-- This is just for reference

SELECT 'Content management schema created successfully!' as status;
