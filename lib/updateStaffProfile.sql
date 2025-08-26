-- Update your staff profile with complete information
UPDATE user_profiles 
SET 
    faculty = 'Faculty of Agriculture',
    department = 'Agriculture',
    position = 'Lecturer II', -- or your actual position
    user_type = 'staff',
    profile_completed = true,
    profile_completed_at = NOW(),
    updated_at = NOW()
WHERE id = '5f0267e3-7663-4b16-b818-481e8e2c2497';

-- Verify the update
SELECT 
    email,
    first_name,
    last_name,
    user_type,
    faculty,
    department,
    position,
    profile_completed
FROM user_profiles 
WHERE id = '5f0267e3-7663-4b16-b818-481e8e2c2497';
