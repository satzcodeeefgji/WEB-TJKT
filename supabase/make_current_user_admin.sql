-- Create/fix the profile for your current NISN login and make it admin.
-- Run this in Supabase SQL Editor after the auth user has signed up.
INSERT INTO public.profiles (id, nisn, role)
SELECT id, split_part(email, '@', 1), 'admin'
FROM auth.users
WHERE email = '12531074@xtjkt2.com'
ON CONFLICT (id)
DO UPDATE SET
  nisn = EXCLUDED.nisn,
  role = 'admin';
