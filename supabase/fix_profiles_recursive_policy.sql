-- Fix infinite recursion caused by profiles policies querying profiles itself.
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- The app only needs users to read their own profile to determine role.
-- Admin dashboard-style "view all profiles" should be handled with service role/server code.
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);
