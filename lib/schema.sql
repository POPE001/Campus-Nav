-- ================================
-- Campus Navigation App Database Schema
-- ================================

-- Enable Row Level Security (RLS)
-- This ensures users can only access their own data

-- ================================
-- Courses Table
-- ================================
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    code TEXT NOT NULL,
    instructor TEXT NOT NULL,
    location TEXT NOT NULL,
    venue_id TEXT, -- References venues from constants/Venues.ts
    day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
    start_time TEXT NOT NULL, -- Format: 'HH:MM' (24-hour)
    end_time TEXT NOT NULL,   -- Format: 'HH:MM' (24-hour)
    color TEXT NOT NULL,      -- Hex color code
    type TEXT NOT NULL CHECK (type IN ('class', 'exam', 'deadline')),
    description TEXT,
    reminder_enabled BOOLEAN DEFAULT true,
    reminder_minutes INTEGER DEFAULT 15,
    exam_date DATE,           -- For exam type courses
    deadline_date DATE,       -- For deadline type courses
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- Indexes for Performance
-- ================================
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_day ON courses(day);
CREATE INDEX IF NOT EXISTS idx_courses_user_day ON courses(user_id, day);
CREATE INDEX IF NOT EXISTS idx_courses_type ON courses(type);

-- ================================
-- Row Level Security (RLS) Policies
-- ================================
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own courses
CREATE POLICY "Users can view their own courses" ON courses
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert their own courses
CREATE POLICY "Users can insert their own courses" ON courses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own courses
CREATE POLICY "Users can update their own courses" ON courses
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can only delete their own courses
CREATE POLICY "Users can delete their own courses" ON courses
    FOR DELETE USING (auth.uid() = user_id);

-- ================================
-- Trigger to Update updated_at
-- ================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- Sample Data for Testing (Optional)
-- ================================
-- You can run this after authentication is set up to test the system
/*
INSERT INTO courses (
    id, title, code, instructor, location, venue_id, day, start_time, end_time, 
    color, type, description, reminder_enabled, reminder_minutes, user_id
) VALUES 
(
    'sample_1',
    'Computer Science 101',
    'CSC 101',
    'Dr. Smith',
    'Computer Laboratory 1',
    'science',
    'Monday',
    '09:00',
    '11:00',
    '#667eea',
    'class',
    'Introduction to programming concepts',
    true,
    15,
    auth.uid() -- Replace with actual user ID
);
*/

-- ================================
-- Comments
-- ================================
COMMENT ON TABLE courses IS 'User course schedules and timetables';
COMMENT ON COLUMN courses.venue_id IS 'References venue IDs from the venues constants file';
COMMENT ON COLUMN courses.day IS 'Day of the week for recurring classes';
COMMENT ON COLUMN courses.start_time IS 'Start time in HH:MM format (24-hour)';
COMMENT ON COLUMN courses.end_time IS 'End time in HH:MM format (24-hour)';
COMMENT ON COLUMN courses.color IS 'Hex color code for UI display';
COMMENT ON COLUMN courses.type IS 'Type of course entry: class, exam, or deadline';
COMMENT ON COLUMN courses.exam_date IS 'Specific date for exams (overrides day/time)';
COMMENT ON COLUMN courses.deadline_date IS 'Specific date for assignment deadlines';
