-- Make every auth user with NISN 12531074 an admin, regardless of email domain.
-- Useful if an older session/user was created before the login email domain changed.
INSERT INTO public.profiles (id, nisn, role)
SELECT id, split_part(email, '@', 1), 'admin'
FROM auth.users
WHERE split_part(email, '@', 1) = '12531074'
ON CONFLICT (id)
DO UPDATE SET
  nisn = EXCLUDED.nisn,
  role = 'admin';
