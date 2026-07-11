-- Migration: Multi-Workspace Foundation and Safe Backfill
-- Target: Supabase DB Local Setup

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create New Types/Enums
CREATE TYPE public.workspace_permission_role AS ENUM (
    'owner',
    'admin',
    'manager',
    'member',
    'guest'
);

CREATE TYPE public.workspace_job_role AS ENUM (
    'operations',
    'marketing',
    'social_media',
    'video_editor',
    'software',
    'university_representative',
    'courier_operations',
    'custom'
);

CREATE TYPE public.workspace_membership_status AS ENUM (
    'invited',
    'active',
    'suspended',
    'expired',
    'left'
);

CREATE TYPE public.workspace_invitation_status AS ENUM (
    'pending',
    'accepted',
    'declined',
    'expired',
    'revoked'
);

-- 2. Create Workspaces Table
CREATE TABLE public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (name <> ''),
    slug TEXT UNIQUE NOT NULL,
    industry TEXT,
    logo_url TEXT,
    default_language TEXT NOT NULL DEFAULT 'tr',
    timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT check_workspaces_slug_format CHECK (slug ~* '^[a-z0-9-]+$')
);

-- Bind trigger for workspaces
CREATE TRIGGER tr_workspaces_updated_at 
    BEFORE UPDATE ON public.workspaces 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Add workspace_id columns to existing MVP tables (Nullable initially for backfill)
-- Added early so that foreign key references from child tables can be established
ALTER TABLE public.universities ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.businesses ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.contracts ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.daily_updates ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.meetings ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.performance_metrics ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.performance_scores ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Add unique constraint to tasks to allow compound references by (id, workspace_id)
ALTER TABLE public.tasks ADD CONSTRAINT tasks_id_workspace_id_key UNIQUE (id, workspace_id);

-- 4. Create Workspace Settings Table
CREATE TABLE public.workspace_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID UNIQUE NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    require_mfa_for_owner BOOLEAN NOT NULL DEFAULT false,
    require_mfa_for_admin BOOLEAN NOT NULL DEFAULT false,
    require_mfa_for_manager BOOLEAN NOT NULL DEFAULT false,
    daily_update_required BOOLEAN NOT NULL DEFAULT true,
    daily_update_deadline TIME NOT NULL DEFAULT '20:00:00',
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bind trigger for settings
CREATE TRIGGER tr_workspace_settings_updated_at 
    BEFORE UPDATE ON public.workspace_settings 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Create Workspace Members Table
CREATE TABLE public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission_role public.workspace_permission_role NOT NULL DEFAULT 'member',
    job_role public.workspace_job_role NOT NULL DEFAULT 'operations',
    custom_job_role TEXT,
    department TEXT,
    membership_status public.workspace_membership_status NOT NULL DEFAULT 'invited',
    access_expires_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT check_members_custom_job_role CHECK (
        (job_role = 'custom' AND custom_job_role IS NOT NULL AND custom_job_role <> '') OR
        (job_role <> 'custom' AND custom_job_role IS NULL)
    ),
    CONSTRAINT check_owner_membership_active CHECK (
        (permission_role = 'owner' AND membership_status = 'active') OR
        (permission_role <> 'owner')
    )
);

-- Bind trigger for members
CREATE TRIGGER tr_workspace_members_updated_at 
    BEFORE UPDATE ON public.workspace_members 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Create Workspace Member University Scopes Table
CREATE TABLE public.workspace_member_university_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_member_id UUID NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_member_id, university_id)
);

-- 7. Create Workspace Invitations Table
CREATE TABLE public.workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    normalized_email TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    permission_role public.workspace_permission_role NOT NULL DEFAULT 'member',
    job_role public.workspace_job_role NOT NULL DEFAULT 'operations',
    custom_job_role TEXT,
    department TEXT,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    invitation_status public.workspace_invitation_status NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    access_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_invitations_normalized_email CHECK (normalized_email = lower(trim(normalized_email))),
    CONSTRAINT check_invitations_custom_job_role CHECK (
        (job_role = 'custom' AND custom_job_role IS NOT NULL AND custom_job_role <> '') OR
        (job_role <> 'custom' AND custom_job_role IS NULL)
    )
);

-- Bind trigger for invitations
CREATE TRIGGER tr_workspace_invitations_updated_at 
    BEFORE UPDATE ON public.workspace_invitations 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Create Workspace Invitation University Scopes Table
CREATE TABLE public.workspace_invitation_university_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_invitation_id UUID NOT NULL REFERENCES public.workspace_invitations(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_invitation_id, university_id)
);

-- 9. Create Pending Task Assignments Table
CREATE TABLE public.pending_task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    workspace_invitation_id UUID NOT NULL REFERENCES public.workspace_invitations(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    normalized_email TEXT NOT NULL,
    assignment_role TEXT NOT NULL CHECK (assignment_role IN ('primary_assignee', 'supporter')),
    idempotency_key TEXT UNIQUE NOT NULL,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_pending_assignments_normalized_email CHECK (normalized_email = lower(trim(normalized_email))),
    CONSTRAINT fk_pending_task_assignments_task_workspace 
        FOREIGN KEY (task_id, workspace_id) 
        REFERENCES public.tasks(id, workspace_id) ON DELETE CASCADE
);

-- 10. Add last_active_workspace_id to profiles
ALTER TABLE public.profiles ADD COLUMN last_active_workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- 11. Deterministic Default Workspace Setup & Backfill Execution
DO $$
DECLARE
    v_user_id UUID;
    v_default_ws_id UUID := 'df39e73b-bf72-4d1a-9694-82bd8996b797';
BEGIN
    -- Create Default Workspace
    INSERT INTO public.workspaces (id, name, slug, default_language, timezone, is_active)
    VALUES (v_default_ws_id, 'Kampüs Kapında', 'kampus-kapinda', 'tr', 'Europe/Istanbul', true)
    ON CONFLICT (id) DO NOTHING;

    -- Create Default Settings
    INSERT INTO public.workspace_settings (workspace_id)
    VALUES (v_default_ws_id)
    ON CONFLICT (workspace_id) DO NOTHING;

    -- Map User resultankilic.business@gmail.com
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'resultankilic.business@gmail.com' LIMIT 1;
    
    -- Sync existing profiles to default workspace members (Idempotent via NOT EXISTS)
    INSERT INTO public.workspace_members (
        workspace_id,
        user_id,
        permission_role,
        job_role,
        custom_job_role,
        membership_status,
        joined_at
    )
    SELECT
        v_default_ws_id,
        id,
        CASE 
            WHEN email = 'resultankilic.business@gmail.com' THEN 'owner'::public.workspace_permission_role
            WHEN role = 'admin' THEN 'admin'::public.workspace_permission_role
            ELSE 'member'::public.workspace_permission_role
        END,
        CASE 
            WHEN role IN ('operations', 'marketing', 'social_media', 'video_editor', 'software', 'university_representative', 'courier_operations') 
                THEN role::text::public.workspace_job_role
            ELSE 'custom'::public.workspace_job_role
        END,
        CASE 
            WHEN role NOT IN ('operations', 'marketing', 'social_media', 'video_editor', 'software', 'university_representative', 'courier_operations') 
                THEN role::text
            ELSE NULL
        END,
        'active'::public.workspace_membership_status,
        created_at
    FROM public.profiles p
    WHERE NOT EXISTS (
        SELECT 1 FROM public.workspace_members wm 
        WHERE wm.workspace_id = v_default_ws_id AND wm.user_id = p.id
    );

    -- Sync existing profile university scopes (Idempotent via NOT EXISTS)
    INSERT INTO public.workspace_member_university_scopes (workspace_member_id, university_id)
    SELECT wm.id, p.university_id
    FROM public.workspace_members wm
    JOIN public.profiles p ON p.id = wm.user_id
    WHERE p.university_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM public.workspace_member_university_scopes wmus
          WHERE wmus.workspace_member_id = wm.id AND wmus.university_id = p.university_id
      );

    -- Setup Owner last active workspace
    IF v_user_id IS NOT NULL THEN
        UPDATE public.profiles 
        SET last_active_workspace_id = v_default_ws_id 
        WHERE id = v_user_id;
    END IF;

    -- Backfill all tenant data
    UPDATE public.universities SET workspace_id = v_default_ws_id WHERE workspace_id IS NULL;
    UPDATE public.projects SET workspace_id = v_default_ws_id WHERE workspace_id IS NULL;
    UPDATE public.tasks SET workspace_id = v_default_ws_id WHERE workspace_id IS NULL;
    UPDATE public.businesses SET workspace_id = v_default_ws_id WHERE workspace_id IS NULL;
    UPDATE public.contracts SET workspace_id = v_default_ws_id WHERE workspace_id IS NULL;
    UPDATE public.daily_updates SET workspace_id = v_default_ws_id WHERE workspace_id IS NULL;
    UPDATE public.meetings SET workspace_id = v_default_ws_id WHERE workspace_id IS NULL;
    UPDATE public.notifications SET workspace_id = v_default_ws_id WHERE workspace_id IS NULL;
    UPDATE public.performance_metrics SET workspace_id = v_default_ws_id WHERE workspace_id IS NULL;
    UPDATE public.performance_scores SET workspace_id = v_default_ws_id WHERE workspace_id IS NULL;
END $$;

-- 12. Enforce NOT NULL constraints on workspace_id fields after backfill completes
ALTER TABLE public.universities ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.projects ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.businesses ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.contracts ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.daily_updates ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.notifications ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.performance_metrics ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.performance_scores ALTER COLUMN workspace_id SET NOT NULL;

-- 13. Map access_invitations to workspace_invitations (Idempotent via NOT EXISTS)
INSERT INTO public.workspace_invitations (
    workspace_id,
    normalized_email,
    token_hash,
    permission_role,
    job_role,
    custom_job_role,
    invited_by,
    invitation_status,
    expires_at,
    accepted_at,
    created_at
)
SELECT
    'df39e73b-bf72-4d1a-9694-82bd8996b797'::UUID,
    lower(trim(email)),
    encode(digest(email || '_seed', 'sha256'), 'hex'),
    CASE 
        WHEN role = 'admin' THEN 'admin'::public.workspace_permission_role
        ELSE 'member'::public.workspace_permission_role
    END,
    CASE 
        WHEN role IN ('operations', 'marketing', 'social_media', 'video_editor', 'software', 'university_representative', 'courier_operations') 
            THEN role::text::public.workspace_job_role
        ELSE 'custom'::public.workspace_job_role
    END,
    CASE 
        WHEN role NOT IN ('operations', 'marketing', 'social_media', 'video_editor', 'software', 'university_representative', 'courier_operations') 
            THEN role::text
        ELSE NULL
    END,
    invited_by,
    CASE 
        WHEN accepted_at IS NOT NULL THEN 'accepted'::public.workspace_invitation_status
        WHEN expires_at IS NOT NULL AND expires_at < now() THEN 'expired'::public.workspace_invitation_status
        WHEN is_active = false THEN 'revoked'::public.workspace_invitation_status
        ELSE 'pending'::public.workspace_invitation_status
    END,
    expires_at,
    accepted_at,
    invited_at
FROM public.access_invitations ai
WHERE NOT EXISTS (
    SELECT 1 FROM public.workspace_invitations wi 
    WHERE wi.workspace_id = 'df39e73b-bf72-4d1a-9694-82bd8996b797'::UUID 
      AND wi.normalized_email = lower(trim(ai.email))
);

-- Populate workspace_invitation_university_scopes for legacy invitations (Idempotent via NOT EXISTS)
INSERT INTO public.workspace_invitation_university_scopes (workspace_invitation_id, university_id)
SELECT wi.id, ai.university_id
FROM public.workspace_invitations wi
JOIN public.access_invitations ai ON lower(trim(ai.email)) = wi.normalized_email
WHERE ai.university_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.workspace_invitation_university_scopes wius
      WHERE wius.workspace_invitation_id = wi.id AND wius.university_id = ai.university_id
  );

-- 14. Indexes Plan Enforced

-- Workspace indexes
CREATE UNIQUE INDEX idx_workspaces_slug ON public.workspaces(slug);

-- Member indexes
CREATE UNIQUE INDEX idx_workspace_members_workspace_user 
    ON public.workspace_members(workspace_id, user_id) 
    WHERE (deleted_at IS NULL AND membership_status IN ('active'::public.workspace_membership_status, 'invited'::public.workspace_membership_status, 'suspended'::public.workspace_membership_status));

CREATE INDEX idx_workspace_members_workspace_status 
    ON public.workspace_members(workspace_id, membership_status);

-- Invitation indexes
CREATE UNIQUE INDEX idx_unique_active_pending_invitation_per_workspace_email 
    ON public.workspace_invitations(workspace_id, normalized_email) 
    WHERE (invitation_status = 'pending'::public.workspace_invitation_status);

CREATE UNIQUE INDEX idx_workspace_invitations_token_hash 
    ON public.workspace_invitations(token_hash);

CREATE INDEX idx_workspace_invitations_workspace_status 
    ON public.workspace_invitations(workspace_id, invitation_status);

CREATE INDEX idx_invitations_normalized_email 
    ON public.workspace_invitations(normalized_email);

-- University scope indexes
CREATE INDEX idx_workspace_member_uni_scopes 
    ON public.workspace_member_university_scopes(workspace_member_id, university_id);

-- Pending assignment index
CREATE INDEX idx_pending_task_assignments_workspace_email 
    ON public.pending_task_assignments(workspace_id, normalized_email);

-- Tenant table filters indexing (workspace_id + deleted_at or workspace_id + status)
CREATE INDEX idx_universities_workspace_deleted ON public.universities(workspace_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_workspace_deleted ON public.projects(workspace_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_workspace_deleted ON public.tasks(workspace_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_workspace_status ON public.tasks(workspace_id, status);
CREATE INDEX idx_businesses_workspace_deleted ON public.businesses(workspace_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_businesses_workspace_stage ON public.businesses(workspace_id, stage);
CREATE INDEX idx_contracts_workspace_deleted ON public.contracts(workspace_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_daily_updates_workspace ON public.daily_updates(workspace_id);
CREATE INDEX idx_meetings_workspace ON public.meetings(workspace_id);
CREATE INDEX idx_notifications_workspace_read ON public.notifications(workspace_id, is_read);
CREATE INDEX idx_performance_scores_workspace ON public.performance_scores(workspace_id);
CREATE INDEX idx_performance_metrics_workspace ON public.performance_metrics(workspace_id);

-- 15. Redefine register_current_device to populate notifications.workspace_id
CREATE OR REPLACE FUNCTION public.register_current_device(
    p_device_hash TEXT,
    p_device_name TEXT,
    p_platform TEXT,
    p_app_version TEXT,
    p_push_token TEXT
)
RETURNS json AS $$
DECLARE
    v_count int;
    v_device RECORD;
    v_new_id UUID;
    v_ws_id UUID;
BEGIN
    -- Check if device is already active for this user
    SELECT * INTO v_device 
    FROM public.user_devices 
    WHERE user_id = auth.uid() AND device_identifier_hash = p_device_hash;
    
    IF FOUND THEN
        -- If it is revoked/inactive, check limit before reactivating
        IF NOT v_device.is_active THEN
            SELECT count(*) INTO v_count 
            FROM public.user_devices 
            WHERE user_id = auth.uid() AND is_active = true;
            
            IF v_count >= 2 THEN
                RETURN json_build_object('success', false, 'error', 'DEVICE_LIMIT_REACHED');
            END IF;
        END IF;
        
        -- Update existing device
        UPDATE public.user_devices 
        SET is_active = true,
            last_seen_at = now(),
            revoked_at = null,
            device_name = p_device_name,
            platform = p_platform,
            app_version = p_app_version,
            push_token = p_push_token
        WHERE id = v_device.id;
        
        RETURN json_build_object('success', true, 'device_id', v_device.id);
    END IF;
    
    -- Check device limits for new registrations
    SELECT count(*) INTO v_count 
    FROM public.user_devices 
    WHERE user_id = auth.uid() AND is_active = true;
    
    IF v_count >= 2 THEN
        RETURN json_build_object('success', false, 'error', 'DEVICE_LIMIT_REACHED');
    END IF;
    
    -- Register new device
    INSERT INTO public.user_devices (
        user_id, 
        device_identifier_hash, 
        device_name, 
        platform, 
        app_version, 
        push_token, 
        is_active, 
        first_seen_at, 
        last_seen_at
    ) VALUES (
        auth.uid(),
        p_device_hash,
        p_device_name,
        p_platform,
        p_app_version,
        p_push_token,
        true,
        now(),
        now()
    ) RETURNING id INTO v_new_id;
    
    -- Retrieve last active workspace or default
    SELECT COALESCE(last_active_workspace_id, 'df39e73b-bf72-4d1a-9694-82bd8996b797'::UUID) INTO v_ws_id 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    IF v_ws_id IS NULL THEN
        v_ws_id := 'df39e73b-bf72-4d1a-9694-82bd8996b797'::UUID;
    END IF;

    -- Create new device notification record with workspace_id
    INSERT INTO public.notifications (user_id, title, body, workspace_id)
    VALUES (
        auth.uid(),
        'Yeni cihaz girişi',
        'Cihaz Adı: ' || COALESCE(p_device_name, 'Bilinmiyor') || ', Platform: ' || COALESCE(p_platform, 'Bilinmiyor') || ', Sürüm: ' || COALESCE(p_app_version, 'Bilinmiyor') || ', Tarih: ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
        v_ws_id
    );
    
    RETURN json_build_object('success', true, 'device_id', v_new_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
