-- Migration: Fix invitation task assignment resolution and add narrow exception for task updates
-- Target: Supabase DB Local Setup

-- 1. Recreate accept_current_user_workspace_invitation with safe resolution sequence
CREATE OR REPLACE FUNCTION public.accept_current_user_workspace_invitation(p_invitation_id UUID)
RETURNS JSON AS $$
DECLARE
    v_email TEXT;
    v_invitation RECORD;
    v_member_id UUID;
    v_assignment RECORD;
BEGIN
    -- 1. Verify user email in JWT
    v_email := lower(trim(auth.jwt() ->> 'email'));
    IF v_email IS NULL OR v_email = '' THEN
        RAISE EXCEPTION 'Unauthorized: User email not found in token' USING ERRCODE = '42501';
    END IF;

    -- 2. Lock invitation row
    SELECT * INTO v_invitation
    FROM public.workspace_invitations
    WHERE id = p_invitation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found';
    END IF;

    -- Verify email matches
    IF v_invitation.normalized_email <> v_email THEN
        RAISE EXCEPTION 'Unauthorized: Invitation email mismatch' USING ERRCODE = '42501';
    END IF;

    -- Validate status is pending and not expired
    IF v_invitation.invitation_status <> 'pending'::public.workspace_invitation_status THEN
        RAISE EXCEPTION 'Invitation is not pending';
    END IF;

    IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < now() THEN
        UPDATE public.workspace_invitations
        SET invitation_status = 'expired'::public.workspace_invitation_status,
            updated_at = now()
        WHERE id = p_invitation_id;
        RAISE EXCEPTION 'Invitation has expired';
    END IF;

    -- 3. Create or reactivate membership (idempotent matching specific partial unique index)
    INSERT INTO public.workspace_members (
        workspace_id,
        user_id,
        permission_role,
        job_role,
        custom_job_role,
        department,
        membership_status,
        access_expires_at,
        joined_at
    )
    VALUES (
        v_invitation.workspace_id,
        auth.uid(),
        v_invitation.permission_role,
        v_invitation.job_role,
        v_invitation.custom_job_role,
        v_invitation.department,
        'active',
        v_invitation.access_expires_at,
        now()
    )
    ON CONFLICT (workspace_id, user_id) 
    WHERE (deleted_at IS NULL AND membership_status IN ('active'::public.workspace_membership_status, 'invited'::public.workspace_membership_status, 'suspended'::public.workspace_membership_status))
    DO UPDATE SET
        permission_role = EXCLUDED.permission_role,
        job_role = EXCLUDED.job_role,
        custom_job_role = EXCLUDED.custom_job_role,
        department = EXCLUDED.department,
        membership_status = 'active',
        access_expires_at = EXCLUDED.access_expires_at,
        deleted_at = NULL,
        updated_at = now()
    RETURNING id INTO v_member_id;

    -- 4. Map scopes
    INSERT INTO public.workspace_member_university_scopes (workspace_member_id, university_id, created_by)
    SELECT v_member_id, university_id, auth.uid()
    FROM public.workspace_invitation_university_scopes
    WHERE workspace_invitation_id = p_invitation_id
    ON CONFLICT (workspace_member_id, university_id) DO NOTHING;

    -- 5. Mark invitation accepted first (essential for RLS and triggers querying invitations table)
    UPDATE public.workspace_invitations
    SET invitation_status = 'accepted'::public.workspace_invitation_status,
        accepted_at = now(),
        updated_at = now()
    WHERE id = p_invitation_id;

    -- 6. Map pending task assignments (idempotent update of resolved fields prior to task updates)
    FOR v_assignment IN 
        SELECT * FROM public.pending_task_assignments
        WHERE workspace_invitation_id = p_invitation_id AND resolved_at IS NULL
        FOR UPDATE
    LOOP
        -- Idempotently update resolution metadata
        UPDATE public.pending_task_assignments
        SET resolved_user_id = auth.uid(),
            resolved_at = now()
        WHERE id = v_assignment.id;

        -- Apply task update
        IF v_assignment.assignment_role = 'primary_assignee' THEN
            -- Only update primary_assignee_id if it is currently NULL (prevents overwriting another assignee)
            UPDATE public.tasks
            SET primary_assignee_id = auth.uid(),
                updated_at = now()
            WHERE id = v_assignment.task_id 
              AND workspace_id = v_assignment.workspace_id
              AND primary_assignee_id IS NULL;
              
        ELSIF v_assignment.assignment_role = 'supporter' THEN
            -- Add as supporter idempotently
            UPDATE public.tasks
            SET supporters = array_append(supporters, auth.uid()),
                updated_at = now()
            WHERE id = v_assignment.task_id 
              AND workspace_id = v_assignment.workspace_id
              AND NOT (auth.uid() = ANY(COALESCE(supporters, ARRAY[]::uuid[])));
        END IF;
    END LOOP;

    -- 7. Update profile last active workspace
    UPDATE public.profiles
    SET last_active_workspace_id = COALESCE(last_active_workspace_id, v_invitation.workspace_id)
    WHERE id = auth.uid();

    -- 8. Generate notification
    INSERT INTO public.notifications (user_id, workspace_id, title, body, notification_scope)
    VALUES (
        auth.uid(),
        v_invitation.workspace_id,
        'Ekibe katıldınız',
        'Çalışma alanına başarıyla katıldınız.',
        'workspace'::public.notification_scope
    );

    -- 9. Log audit trail
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, payload, workspace_id)
    VALUES (
        auth.uid(),
        'ACCEPT_INVITATION',
        'workspace_invitations',
        p_invitation_id,
        json_build_object('workspace_id', v_invitation.workspace_id, 'member_id', v_member_id),
        v_invitation.workspace_id
    );

    RETURN json_build_object(
        'success', true,
        'workspace_id', v_invitation.workspace_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE EXECUTE ON FUNCTION public.accept_current_user_workspace_invitation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_current_user_workspace_invitation(UUID) TO authenticated;


-- 2. Recreate enforce_task_update_fields with a narrow exception for resolved task assignments
CREATE OR REPLACE FUNCTION public.enforce_task_update_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_role public.workspace_permission_role;
    v_is_valid_resolution BOOLEAN := FALSE;
BEGIN
    v_role := public.current_workspace_permission_role(OLD.workspace_id);
    
    -- Owners, Admins, and Managers can edit anything
    IF v_role = 'owner' OR v_role = 'admin' OR v_role = 'manager' THEN
        RETURN NEW;
    END IF;

    -- Narrow exception check for pending task assignment resolution by the user themselves
    IF (OLD.primary_assignee_id IS NULL OR OLD.primary_assignee_id = auth.uid()) AND
       NEW.primary_assignee_id = auth.uid() AND
       NEW.workspace_id = OLD.workspace_id AND
       public.is_active_workspace_member(NEW.workspace_id)
    THEN
        -- Verify matching resolved pending assignment in the workspace
        SELECT EXISTS (
            SELECT 1 
            FROM public.pending_task_assignments pta
            JOIN public.workspace_invitations wi ON wi.id = pta.workspace_invitation_id
            WHERE pta.task_id = NEW.id
              AND pta.workspace_id = NEW.workspace_id
              AND pta.resolved_user_id = auth.uid()
              AND pta.resolved_at IS NOT NULL
              AND wi.invitation_status = 'accepted'::public.workspace_invitation_status
              AND wi.normalized_email = lower(trim(auth.jwt() ->> 'email'))
        ) INTO v_is_valid_resolution;
    END IF;

    -- Validate fields changes
    IF v_is_valid_resolution THEN
        -- Allowed to change primary_assignee_id and updated_at.
        -- BUT no other fields are allowed to change, EXCEPT the standard non-manager fields (status, waiting_reason, completion_evidence_url) if also changed.
        IF (OLD.title IS DISTINCT FROM NEW.title OR
            OLD.description IS DISTINCT FROM NEW.description OR
            OLD.project_id IS DISTINCT FROM NEW.project_id OR
            OLD.university_id IS DISTINCT FROM NEW.university_id OR
            OLD.business_id IS DISTINCT FROM NEW.business_id OR
            OLD.supporters IS DISTINCT FROM NEW.supporters OR
            OLD.start_date IS DISTINCT FROM NEW.start_date OR
            OLD.due_date IS DISTINCT FROM NEW.due_date OR
            OLD.priority IS DISTINCT FROM NEW.priority OR
            OLD.effort_score IS DISTINCT FROM NEW.effort_score OR
            OLD.completion_evidence_required IS DISTINCT FROM NEW.completion_evidence_required OR
            OLD.created_by IS DISTINCT FROM NEW.created_by OR
            OLD.created_at IS DISTINCT FROM NEW.created_at OR
            OLD.deleted_at IS DISTINCT FROM NEW.deleted_at OR
            OLD.workspace_id IS DISTINCT FROM NEW.workspace_id) THEN
            RAISE EXCEPTION 'Access denied: Non-manager users are only allowed to update task status, waiting reason, and completion evidence.';
        END IF;
    ELSE
        -- Standard validation rules apply strictly: primary_assignee_id cannot change!
        IF (OLD.title IS DISTINCT FROM NEW.title OR
            OLD.description IS DISTINCT FROM NEW.description OR
            OLD.project_id IS DISTINCT FROM NEW.project_id OR
            OLD.university_id IS DISTINCT FROM NEW.university_id OR
            OLD.business_id IS DISTINCT FROM NEW.business_id OR
            OLD.primary_assignee_id IS DISTINCT FROM NEW.primary_assignee_id OR
            OLD.supporters IS DISTINCT FROM NEW.supporters OR
            OLD.start_date IS DISTINCT FROM NEW.start_date OR
            OLD.due_date IS DISTINCT FROM NEW.due_date OR
            OLD.priority IS DISTINCT FROM NEW.priority OR
            OLD.effort_score IS DISTINCT FROM NEW.effort_score OR
            OLD.completion_evidence_required IS DISTINCT FROM NEW.completion_evidence_required OR
            OLD.created_by IS DISTINCT FROM NEW.created_by OR
            OLD.created_at IS DISTINCT FROM NEW.created_at OR
            OLD.deleted_at IS DISTINCT FROM NEW.deleted_at OR
            OLD.workspace_id IS DISTINCT FROM NEW.workspace_id) THEN
            RAISE EXCEPTION 'Access denied: Non-manager users are only allowed to update task status, waiting reason, and completion evidence.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
