-- Update your profile to populate the full_name field
UPDATE user_profiles 
SET 
    full_name = CONCAT(first_name, ' ', last_name),
    updated_at = NOW()
WHERE id = '5f0267e3-7663-4b16-b818-481e8e2c2497';

-- Verify the update
SELECT 
    first_name,
    last_name,
    full_name,
    email,
    user_type,
    faculty,
    department,
    position
FROM user_profiles 
WHERE id = '5f0267e3-7663-4b16-b818-481e8e2c2497';
