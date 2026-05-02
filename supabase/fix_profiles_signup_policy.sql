-- Allow logged-in users to create their own profile as a normal user.
-- Run this once if signup fails with an RLS/profile error.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can create their own profile'
  ) THEN
    CREATE POLICY "Users can create their own profile"
      ON profiles FOR INSERT
      WITH CHECK (auth.uid() = id AND role = 'user');
  END IF;
END $$;
