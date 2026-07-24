-- Migration: Fix owner constraint check during workspace deletion
-- Date: 2026-07-24

CREATE OR REPLACE FUNCTION public.enforce_owner_constraints()
RETURNS TRIGGER AS $$
DECLARE
    v_owner_count INT;
    v_workspace_id UUID;
    v_workspace_exists BOOLEAN;
BEGIN
    -- Operate on the correct workspace_id
    v_workspace_id := OLD.workspace_id;

    -- If the workspace itself is being deleted, do not enforce owner constraints
    SELECT EXISTS (
        SELECT 1 FROM public.workspaces WHERE id = v_workspace_id
    ) INTO v_workspace_exists;

    IF NOT v_workspace_exists THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- Only check active workspace owners
    IF OLD.permission_role = 'owner' THEN
        -- Check if role is demoted, membership status is changed, soft-delete is set, or row is deleted, or expired
        IF TG_OP = 'DELETE' OR
           (TG_OP = 'UPDATE' AND (
               NEW.permission_role <> 'owner' OR 
               NEW.membership_status <> 'active' OR 
               NEW.deleted_at IS NOT NULL OR
               (NEW.access_expires_at IS NOT NULL AND NEW.access_expires_at <= now())
           ))
        THEN
            -- Pessimistic lock on the workspace record first to serialize operations on this workspace
            PERFORM 1 
            FROM public.workspaces
            WHERE id = v_workspace_id
            FOR UPDATE;

            -- Count remaining active owners in this workspace (without FOR UPDATE on aggregate count)
            SELECT count(*) INTO v_owner_count
            FROM public.workspace_members
            WHERE workspace_id = v_workspace_id 
              AND permission_role = 'owner'
              AND membership_status = 'active'
              AND deleted_at IS NULL
              AND (access_expires_at IS NULL OR access_expires_at > now());

            -- Block operation if this is the last active owner
            IF v_owner_count <= 1 THEN
                RAISE EXCEPTION 'Access denied: Workspace must have at least one active Owner. Transfer ownership before leaving or changing roles.' USING ERRCODE = 'P0001';
            END IF;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;
