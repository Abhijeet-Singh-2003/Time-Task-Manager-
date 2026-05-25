-- Run in Supabase Dashboard → SQL Editor
-- Fixes: "infinite recursion detected in policy for relation project_members"
--
-- Cause: policies that SELECT from project_members (or projects ↔ project_members loop).
-- Fix: SECURITY DEFINER helpers bypass RLS inside the function body.

-- ---------------------------------------------------------------------------
-- 1. Helper functions (run as table owner → no RLS recursion)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = p_project_id
      AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Drop existing policies (adjust names if yours differ)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_members', pol.policyname);
  END LOOP;

  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', pol.policyname);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. project_members — never subquery project_members inside its own policy
-- ---------------------------------------------------------------------------

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Read: own row, or any member row for projects you belong to
CREATE POLICY "project_members_select"
ON public.project_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_project_member(project_id)
);

-- Insert: project owner, app admin, or adding yourself when creating a project
CREATE POLICY "project_members_insert"
ON public.project_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.is_project_owner(project_id)
  OR public.is_app_admin()
);

CREATE POLICY "project_members_update"
ON public.project_members
FOR UPDATE
TO authenticated
USING (public.is_project_owner(project_id) OR public.is_app_admin())
WITH CHECK (public.is_project_owner(project_id) OR public.is_app_admin());

CREATE POLICY "project_members_delete"
ON public.project_members
FOR DELETE
TO authenticated
USING (public.is_project_owner(project_id) OR public.is_app_admin());

-- ---------------------------------------------------------------------------
-- 4. projects — use helpers, not raw EXISTS on project_members from client RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select"
ON public.projects
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.is_project_member(id)
  OR public.is_app_admin()
);

CREATE POLICY "projects_insert"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid() OR public.is_app_admin());

CREATE POLICY "projects_update"
ON public.projects
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid() OR public.is_app_admin())
WITH CHECK (owner_id = auth.uid() OR public.is_app_admin());

CREATE POLICY "projects_delete"
ON public.projects
FOR DELETE
TO authenticated
USING (owner_id = auth.uid() OR public.is_app_admin());
