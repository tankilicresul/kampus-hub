-- Migration: Fix owner safety trigger concurrency and workspace owner creation constraint compliance
-- Target: Supabase DB Local Setup

-- 1. Recreate Owner Guard Trigger Function to use workspaces locking (fixing 0A000: FOR UPDATE aggregate error)
CREATE OR REPLACE FUNCTION public.enforce_owner_constraints()
RETURNS TRIGGER AS $$
DECLARE
    v_owner_count INT;
    v_workspace_id UUID;
BEGIN
    -- Operate on the correct workspace_id
    v_workspace_id := OLD.workspace_id;

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


-- 2. Recreate Workspace Creation RPC (fixing check_members_custom_job_role constraint error)
CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(
    workspace_name TEXT,
    requested_slug TEXT,
    industry TEXT,
    default_language TEXT DEFAULT 'tr',
    timezone TEXT DEFAULT 'Europe/Istanbul'
)
RETURNS JSON AS $$
DECLARE
    v_workspace_id UUID;
    v_slug TEXT;
BEGIN
    -- 1. Verify authenticated user
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
    END IF;

    -- 2. Validate workspace name
    IF workspace_name IS NULL OR trim(workspace_name) = '' THEN
        RAISE EXCEPTION 'Workspace name cannot be empty';
    END IF;

    -- 3. Normalize slug
    v_slug := lower(trim(requested_slug));
    IF v_slug = '' OR NOT (v_slug ~* '^[a-z0-9-]+$') THEN
        RAISE EXCEPTION 'Invalid slug format';
    END IF;

    -- 4. Check slug uniqueness
    IF EXISTS (SELECT 1 FROM public.workspaces WHERE slug = v_slug) THEN
        RAISE EXCEPTION 'Slug already exists' USING ERRCODE = '23505';
    END IF;

    -- 5. Create workspace
    INSERT INTO public.workspaces (name, slug, industry, default_language, timezone)
    VALUES (workspace_name, v_slug, industry, default_language, timezone)
    RETURNING id INTO v_workspace_id;

    -- 6. Create settings
    INSERT INTO public.workspace_settings (workspace_id)
    VALUES (v_workspace_id);

    -- 7. Add creator as owner (matching constraint rules: permission_role=owner, job_role=custom, custom_job_role='Workspace Owner', status=active)
    INSERT INTO public.workspace_members (workspace_id, user_id, permission_role, job_role, custom_job_role, membership_status)
    VALUES (v_workspace_id, auth.uid(), 'owner', 'custom', 'Workspace Owner', 'active');

    -- 8. Set profiles last active workspace
    UPDATE public.profiles
    SET last_active_workspace_id = v_workspace_id
    WHERE id = auth.uid();

    -- 9. Create audit log
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, payload, workspace_id)
    VALUES (
        auth.uid(),
        'CREATE',
        'workspaces',
        v_workspace_id,
        json_build_object('name', workspace_name, 'slug', v_slug, 'role', 'owner'),
        v_workspace_id
    );

    RETURN json_build_object(
        'success', true,
        'workspace_id', v_workspace_id,
        'name', workspace_name,
        'slug', v_slug
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;
