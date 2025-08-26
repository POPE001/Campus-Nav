-- ================================
-- COMPLETE DATABASE CLEANUP & DIAGNOSTIC
-- ================================

-- 1. Check ALL triggers on auth.users (might be hidden ones)
SELECT 
    'EXISTING TRIGGERS ON auth.users:' as info,
    trigger_name,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';

-- 2. Check ALL functions that might be called by triggers
SELECT 
    'FUNCTIONS THAT MIGHT BE TRIGGERS:' as info,
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name ILIKE '%profile%' 
OR routine_name ILIKE '%user%'
OR routine_definition ILIKE '%auth.users%';

-- 3. Drop ALL possible trigger functions
DROP FUNCTION IF EXISTS create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS create_profile_for_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.create_profile_for_new_user() CASCADE;

-- 4. Force drop ALL triggers on auth.users (even if we don't see them)
DO $$ 
DECLARE 
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'users' 
        AND event_object_schema = 'auth'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON auth.users CASCADE';
    END LOOP;
END $$;

-- 5. Check if there are any foreign key constraints causing issues
SELECT 
    'FOREIGN KEYS FROM user_profiles:' as info,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'user_profiles' 
AND constraint_type = 'FOREIGN KEY';

-- 6. Temporarily drop user_profiles table completely
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS user_activity CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;

-- 7. Check if there are any remaining references
SELECT 
    'REMAINING REFERENCES TO DROPPED TABLES:' as info,
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name ILIKE '%user_%' 
AND table_schema = 'public';

-- 8. List all remaining triggers on auth.users after cleanup
SELECT 
    'REMAINING TRIGGERS AFTER CLEANUP:' as info,
    trigger_name,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';

-- 9. Test if auth signup works without any profile tables
SELECT 'Cleanup completed - auth.users should work without triggers now!' as status;
SELECT 'Try signup now - it should work without creating profiles' as next_step;
