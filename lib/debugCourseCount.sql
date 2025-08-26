-- ================================
-- Debug Course Counting Issue
-- ================================

-- First, let's check what's in the courses table
SELECT 'COURSES TABLE DEBUG:' as debug_section;
SELECT user_id, title, type, COUNT(*) OVER() as total_courses
FROM courses;

-- Check what's in user_profiles table  
SELECT 'USER PROFILES DEBUG:' as debug_section;
SELECT id, email, full_name 
FROM user_profiles;

-- Check the current user's ID
SELECT 'CURRENT USER DEBUG:' as debug_section;
SELECT auth.uid() as current_user_id;

-- Test the JOIN between user_profiles and courses
SELECT 'JOIN TEST:' as debug_section;
SELECT 
    up.id as profile_id,
    up.email,
    c.user_id as course_user_id,
    c.title,
    c.type,
    COUNT(c.id) as course_count
FROM user_profiles up
LEFT JOIN courses c ON up.id = c.user_id
WHERE up.id = auth.uid()
GROUP BY up.id, up.email, c.user_id, c.title, c.type;

-- Test the exact query from the view for current user
SELECT 'VIEW QUERY TEST:' as debug_section;
SELECT 
    user_id,
    COUNT(*) as total_courses,
    COUNT(*) FILTER (WHERE type = 'class') as active_courses,
    COUNT(*) FILTER (WHERE type = 'exam' AND exam_date >= CURRENT_DATE) as upcoming_exams,
    COUNT(*) FILTER (WHERE type = 'deadline' AND deadline_date >= CURRENT_DATE) as pending_deadlines
FROM courses 
WHERE user_id = auth.uid()
GROUP BY user_id;

-- Test the full statistics view for current user
SELECT 'FULL STATISTICS TEST:' as debug_section;
SELECT * 
FROM user_statistics 
WHERE id = auth.uid();
