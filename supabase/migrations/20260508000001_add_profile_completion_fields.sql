-- Add profile completion tracking and phone to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_photo_path TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT FALSE;

-- Add edited_by tracking to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS edited_by TEXT;

-- Add edited_by tracking to kas_payments
ALTER TABLE kas_payments ADD COLUMN IF NOT EXISTS edited_by TEXT;

-- Add edited_by tracking to expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS edited_by TEXT;
