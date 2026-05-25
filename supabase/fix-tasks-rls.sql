-- Run after fix-rls-recursion.sql
-- Allows creating and viewing tasks in your projects

CREATE OR REPLACE FUNCTION public.can_manage_project_tasks(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    public.is_app_admin()
    OR public.is_project_owner(p_project_id)
    OR public.is_project_member(p_project_id);
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_project_tasks(uuid) TO authenticated;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tasks', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated
USING (
  assignee_id = auth.uid()
  OR public.is_app_admin()
  OR public.is_project_owner(project_id)
  OR public.is_project_member(project_id)
);

CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated
WITH CHECK (public.can_manage_project_tasks(project_id));

CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated
USING (assignee_id = auth.uid() OR public.can_manage_project_tasks(project_id))
WITH CHECK (assignee_id = auth.uid() OR public.can_manage_project_tasks(project_id));

CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated
USING (public.is_app_admin() OR public.is_project_owner(project_id));
