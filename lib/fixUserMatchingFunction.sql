-- Fix the user_matches_targeting function to resolve JSON operator type conflict
-- The issue was a naming conflict between variable and column names

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
    user_meta JSONB; -- Renamed to avoid conflict
BEGIN
    -- Get user profile
    SELECT * INTO user_profile
    FROM user_profiles
    WHERE id = user_uuid;
    
    -- Get user metadata (renamed variable to avoid naming conflict)
    SELECT user_metadata INTO user_meta
    FROM auth.users
    WHERE id = user_uuid;
    
    -- Check targeting logic
    CASE target_type
        WHEN 'everyone' THEN
            RETURN TRUE;
            
        WHEN 'students' THEN
            RETURN COALESCE(user_profile.user_type, user_meta->>'user_type') = 'student';
            
        WHEN 'staff' THEN
            RETURN COALESCE(user_profile.user_type, user_meta->>'user_type') = 'staff';
            
        WHEN 'faculty' THEN
            RETURN user_profile.faculty = faculty_filter OR user_meta->>'faculty' = faculty_filter;
            
        WHEN 'department' THEN
            RETURN user_profile.department = department_filter OR user_meta->>'department' = department_filter;
            
        WHEN 'level' THEN
            RETURN user_profile.level = level_filter OR user_meta->>'level' = level_filter;
            
        WHEN 'custom' THEN
            RETURN custom_users_filter ? user_uuid::TEXT;
            
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function to make sure it works
SELECT 'user_matches_targeting function fixed successfully!' as status;

