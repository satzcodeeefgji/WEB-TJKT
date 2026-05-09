
DROP POLICY IF EXISTS "Only admins can create students" ON students;
DROP POLICY IF EXISTS "Users can create students" ON students;
DROP POLICY IF EXISTS "Only admins can update students" ON students;

CREATE POLICY "Users can create students"
  ON students FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update students"
  ON students FOR UPDATE
  WITH CHECK (auth.uid() IS NOT NULL);
