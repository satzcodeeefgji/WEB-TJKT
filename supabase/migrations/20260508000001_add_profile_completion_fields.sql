-- Add profile completion tracking and phone to students
ALTER TABLE students ADD COLUMN phone TEXT;
ALTER TABLE students ADD COLUMN profile_photo_path TEXT;
ALTER TABLE students ADD COLUMN is_profile_complete BOOLEAN DEFAULT FALSE;

-- Add edited_by tracking to tasks
ALTER TABLE tasks ADD COLUMN edited_by TEXT;

-- Add edited_by tracking to kas_payments
ALTER TABLE kas_payments ADD COLUMN edited_by TEXT;

-- Add edited_by tracking to expenses
ALTER TABLE expenses ADD COLUMN edited_by TEXT;
