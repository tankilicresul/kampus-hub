-- Redefine delete_workspace_as_owner to allow both owner and admin to delete the workspace
CREATE OR REPLACE FUNCTION public.delete_workspace_as_owner(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sadece workspace owner veya admin silebilir
  IF NOT has_workspace_permission(p_workspace_id, ARRAY['owner'::workspace_permission_role, 'admin'::workspace_permission_role]) THEN
    RAISE EXCEPTION 'Sadece ekip sahibi veya yöneticisi bu işlemi yapabilir.';
  END IF;

  -- Workspace'i sil (CASCADE tüm alt tabloları temizler)
  DELETE FROM workspaces WHERE id = p_workspace_id;
END;
$$;
