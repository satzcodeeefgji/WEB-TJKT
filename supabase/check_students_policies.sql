-- Check current RLS policies on students table
SELECT * FROM pg_policies WHERE tablename = 'students';
