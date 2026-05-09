-- Fix RLS policies for students table
-- Allow authenticated users to create and update their own student records

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Only admins can create students" ON students;
DROP POLICY IF EXISTS "Users can create students" ON students;
DROP POLICY IF EXISTS "Only admins can update students" ON students;

-- CREATE: Allow any authenticated user to create
CREATE POLICY "Users can create students"
  ON students FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Allow any authenticated user to update
CREATE POLICY "Users can update students"
  ON students FOR UPDATE
  WITH CHECK (auth.uid() IS NOT NULL);
