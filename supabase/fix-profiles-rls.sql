-- Run this to fix profiles table RLS for task assignment
-- Allows authenticated users to view all profiles (needed for task assignment dropdown)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- Allow all authenticated users to read all profiles (needed for task assignment)
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Only admins can insert profiles (done via signup trigger)
CREATE POLICY "profiles_insert_admin" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.jwt() ->> 'email' = email OR false);
