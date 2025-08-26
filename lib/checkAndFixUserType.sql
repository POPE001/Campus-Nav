-- ================================
-- Check and Fix User Type in Supabase Auth
-- ================================

-- First, let's see the structure of the auth.users table
\d auth.users;

-- Check your current user data (alternative approach)
SELECT 
    email, 
    raw_user_meta_data,
    raw_user_meta_data->>'user_type' as current_user_type
FROM auth.users 
WHERE email = 'adeonioluwamayowa@gmail.com';

-- If the above doesn't work, try this simpler version
SELECT * FROM auth.users WHERE email = 'adeonioluwamayowa@gmail.com';

-- Fix: Update the user_type in raw_user_meta_data
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb), 
    '{user_type}', 
    '"staff"'
)
WHERE email = 'adeonioluwamayowa@gmail.com';

-- Alternative fix if raw_user_meta_data doesn't work
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"user_type": "staff"}'::jsonb
WHERE email = 'adeonioluwamayowa@gmail.com';

-- Verify the fix
SELECT 
    email, 
    raw_user_meta_data,
    raw_user_meta_data->>'user_type' as updated_user_type
FROM auth.users 
WHERE email = 'adeonioluwamayowa@gmail.com';
