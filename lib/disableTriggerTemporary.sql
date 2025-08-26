-- ================================
-- Temporarily Disable Trigger to Test Signup
-- ================================

-- 1. Remove ALL triggers that might be causing issues
DROP TRIGGER IF EXISTS create_user_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_user_profile_and_preferences ON auth.users;

-- 2. List any remaining triggers on auth.users
SELECT 
    trigger_name,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';

-- 3. Ensure user_profiles table exists with minimal structure
DROP TABLE IF EXISTS user_profiles CASCADE;

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    user_type TEXT DEFAULT 'student',
    faculty TEXT,
    department TEXT,
    level TEXT,
    position TEXT,
    profile_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Disable RLS temporarily for testing
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 5. Test that we can insert into the table manually
INSERT INTO user_profiles (
    id, 
    email, 
    first_name, 
    last_name, 
    user_type, 
    faculty, 
    department, 
    position,
    profile_completed
) VALUES (
    gen_random_uuid(),
    'test@example.com',
    'Test',
    'User',
    'staff',
    'Faculty of Agriculture',
    'Agriculture',
    'Lecturer II',
    true
);

-- Check if the test insert worked
SELECT COUNT(*) as test_insert_count FROM user_profiles WHERE email = 'test@example.com';

-- Clean up test data
DELETE FROM user_profiles WHERE email = 'test@example.com';

SELECT 'All triggers removed - signup should work now!' as status;
SELECT 'You will need to manually create profiles after signup' as note;
