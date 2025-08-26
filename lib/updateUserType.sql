-- Force update user metadata to staff type
-- Replace 'your-email@gmail.com' with your actual email

UPDATE auth.users 
SET user_metadata = user_metadata || '{"user_type": "staff"}'::jsonb
WHERE email = 'adeonioluwamayowa@gmail.com';

-- Check the result
SELECT 
    email, 
    user_metadata->>'user_type' as user_type,
    user_metadata
FROM auth.users 
WHERE email = 'adeonioluwamayowa@gmail.com';
