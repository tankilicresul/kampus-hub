-- Drop the existing DELETE policy on tasks
DROP POLICY IF EXISTS "Delete tasks in workspace" ON public.tasks;

-- Recreate the DELETE policy to allow owner, admin, and manager roles
CREATE POLICY "Delete tasks in workspace" ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    has_workspace_permission(workspace_id, ARRAY['owner'::workspace_permission_role, 'admin'::workspace_permission_role, 'manager'::workspace_permission_role])
  );
