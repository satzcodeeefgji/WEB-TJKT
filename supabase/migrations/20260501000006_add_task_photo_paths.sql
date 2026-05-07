-- Add photo_paths support to tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS photo_paths TEXT[] DEFAULT '{}';
