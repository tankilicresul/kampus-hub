-- Fix accept_current_user_workspace_invitation database function notification characters encoding
CREATE OR REPLACE FUNCTION public.accept_current_user_workspace_invitation(p_invitation_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;
