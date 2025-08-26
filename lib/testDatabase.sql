-- ================================
-- Test Database Setup for Staff Signup
-- ================================

-- 1. Check if user_profiles table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'user_profiles'
        ) 
        THEN 'user_profiles table EXISTS ✅'
        ELSE 'user_profiles table MISSING ❌'
    END as table_status;

-- 2. List all columns in user_profiles table (if it exists)
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- 3. Check if trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'create_user_profile_on_signup';

-- 4. Check if the trigger function exists
SELECT 
    routine_name,
    routine_type,
    routine_body
FROM information_schema.routines 
WHERE routine_name = 'create_user_profile_and_preferences';

-- 5. Test if we can insert into user_profiles manually
-- (This will fail if table doesn't exist or columns are missing)
DO $$
BEGIN
    -- Try to describe the table structure
    RAISE NOTICE 'Testing user_profiles table structure...';
    
    -- Check specific columns we need
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'position') THEN
        RAISE NOTICE '✅ position column exists';
    ELSE
        RAISE NOTICE '❌ position column MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'first_name') THEN
        RAISE NOTICE '✅ first_name column exists';
    ELSE
        RAISE NOTICE '❌ first_name column MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_name') THEN
        RAISE NOTICE '✅ last_name column exists';
    ELSE
        RAISE NOTICE '❌ last_name column MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'faculty') THEN
        RAISE NOTICE '✅ faculty column exists';
    ELSE
        RAISE NOTICE '❌ faculty column MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'department') THEN
        RAISE NOTICE '✅ department column exists';
    ELSE
        RAISE NOTICE '❌ department column MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'user_type') THEN
        RAISE NOTICE '✅ user_type column exists';
    ELSE
        RAISE NOTICE '❌ user_type column MISSING';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error checking table structure: %', SQLERRM;
END $$;

-- 6. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- 7. Check if we can access auth.users table
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'auth' AND table_name = 'users'
        ) 
        THEN 'auth.users table accessible ✅'
        ELSE 'auth.users table NOT accessible ❌'
    END as auth_status;

-- 8. Show current database name and user
SELECT 
    current_database() as database_name,
    current_user as current_user,
    session_user as session_user;

-- Final summary
SELECT 'Database diagnostic complete! Check the results above.' as summary;
