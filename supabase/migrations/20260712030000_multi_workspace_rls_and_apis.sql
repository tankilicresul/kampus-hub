-- Migration: Tenant RLS, Workspace RPCs and Ownership Security
-- Target: Supabase DB Local Setup

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================================
-- 1. Global & Workspace Notifications Update & Audit Logs Column addition
-- =========================================================================

-- Create notification scope enum type if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_scope') THEN
        CREATE TYPE public.notification_scope AS ENUM ('global', 'workspace');
    END IF;
END $$;

-- Drop check constraint if exists
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS check_notifications_scope_matching;

-- Add columns and modify nullability
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS notification_scope public.notification_scope NOT NULL DEFAULT 'workspace';
ALTER TABLE public.notifications ALTER COLUMN workspace_id DROP NOT NULL;

-- Enforce check constraint
ALTER TABLE public.notifications ADD CONSTRAINT check_notifications_scope_matching CHECK (
    (notification_scope = 'global' AND workspace_id IS NULL) OR
    (notification_scope = 'workspace' AND workspace_id IS NOT NULL)
);

-- Add workspace_id to audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- =========================================================================
-- 2. Secure Workspace Helper Functions (SECURITY DEFINER with strict search_path)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.is_active_workspace_member(target_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.workspace_members
        WHERE workspace_id = target_workspace_id 
          AND user_id = auth.uid() 
          AND membership_status = 'active'
          AND deleted_at IS NULL
          AND (access_expires_at IS NULL OR access_expires_at > now())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE EXECUTE ON FUNCTION public.is_active_workspace_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_workspace_member(UUID) TO authenticated;


CREATE OR REPLACE FUNCTION public.current_workspace_permission_role(target_workspace_id UUID)
RETURNS public.workspace_permission_role AS $$
DECLARE
    v_role public.workspace_permission_role;
BEGIN
    SELECT permission_role INTO v_role
    FROM public.workspace_members
    WHERE workspace_id = target_workspace_id 
      AND user_id = auth.uid() 
      AND membership_status = 'active'
      AND deleted_at IS NULL
      AND (access_expires_at IS NULL OR access_expires_at > now())
    LIMIT 1;
    
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE EXECUTE ON FUNCTION public.current_workspace_permission_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_workspace_permission_role(UUID) TO authenticated;


CREATE OR REPLACE FUNCTION public.current_workspace_job_role(target_workspace_id UUID)
RETURNS public.workspace_job_role AS $$
DECLARE
    v_job_role public.workspace_job_role;
BEGIN
    SELECT job_role INTO v_job_role
    FROM public.workspace_members
    WHERE workspace_id = target_workspace_id 
      AND user_id = auth.uid() 
      AND membership_status = 'active'
      AND deleted_at IS NULL
      AND (access_expires_at IS NULL OR access_expires_at > now())
    LIMIT 1;
    
    RETURN v_job_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE EXECUTE ON FUNCTION public.current_workspace_job_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_workspace_job_role(UUID) TO authenticated;


CREATE OR REPLACE FUNCTION public.has_workspace_permission(
    target_workspace_id UUID,
    allowed_roles public.workspace_permission_role[]
)
RETURNS BOOLEAN AS $$
DECLARE
    v_role public.workspace_permission_role;
BEGIN
    v_role := public.current_workspace_permission_role(target_workspace_id);
    RETURN v_role IS NOT NULL AND v_role = ANY(allowed_roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE EXECUTE ON FUNCTION public.has_workspace_permission(UUID, public.workspace_permission_role[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_workspace_permission(UUID, public.workspace_permission_role[]) TO authenticated;


CREATE OR REPLACE FUNCTION public.can_access_workspace_university(
    target_workspace_id UUID,
    target_university_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_role public.workspace_permission_role;
    v_job_role public.workspace_job_role;
    v_member_id UUID;
BEGIN
    -- Get member details
    SELECT id, permission_role, job_role INTO v_member_id, v_role, v_job_role
    FROM public.workspace_members
    WHERE workspace_id = target_workspace_id 
      AND user_id = auth.uid() 
      AND membership_status = 'active'
      AND deleted_at IS NULL
      AND (access_expires_at IS NULL OR access_expires_at > now())
    LIMIT 1;
    
    IF v_member_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Owners and Admins bypass scope checks
    IF v_role = 'owner' OR v_role = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Representatives are strictly filtered by scopes
    IF v_job_role = 'university_representative' THEN
        RETURN EXISTS (
            SELECT 1 
            FROM public.workspace_member_university_scopes
            WHERE workspace_member_id = v_member_id 
              AND university_id = target_university_id
        );
    END IF;
    
    -- Other roles (manager, members, guests, custom job roles) bypass filters inside workspace
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE EXECUTE ON FUNCTION public.can_access_workspace_university(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_workspace_university(UUID, UUID) TO authenticated;

-- =========================================================================
-- 3. Workspace Member Safety Constraints & Triggers (Owner Protection)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.enforce_owner_constraints()
RETURNS TRIGGER AS $$
DECLARE
    v_owner_count INT;
BEGIN
    -- Only check active workspace owners
    IF OLD.permission_role = 'owner' THEN
        -- Check if role is demoted, membership status is changed, soft-delete is set, or row is deleted
        IF (TG_OP = 'UPDATE' AND (NEW.permission_role <> 'owner' OR NEW.membership_status <> 'active' OR NEW.deleted_at IS NOT NULL)) OR TG_OP = 'DELETE' THEN
            -- Pessimistic locking of active owners inside the workspace
            SELECT count(*) INTO v_owner_count
            FROM public.workspace_members
            WHERE workspace_id = OLD.workspace_id 
              AND permission_role = 'owner'
              AND membership_status = 'active'
              AND deleted_at IS NULL
            FOR UPDATE;

            IF v_owner_count <= 1 THEN
                RAISE EXCEPTION 'Access denied: Workspace must have at least one active Owner. Transfer ownership before leaving or changing roles.';
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

DROP TRIGGER IF EXISTS tr_workspace_members_owner_guard ON public.workspace_members;
CREATE TRIGGER tr_workspace_members_owner_guard
    BEFORE UPDATE OR DELETE ON public.workspace_members
    FOR EACH ROW EXECUTE FUNCTION public.enforce_owner_constraints();

-- =========================================================================
-- 4. Recreate/Enable Row-Level Security on Core Workspace Tables
-- =========================================================================

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_member_university_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitation_university_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_task_assignments ENABLE ROW LEVEL SECURITY;

-- Workspace Policies
DROP POLICY IF EXISTS "Members can view workspaces" ON public.workspaces;
CREATE POLICY "Members can view workspaces" ON public.workspaces
    FOR SELECT TO authenticated USING (public.is_active_workspace_member(id));

DROP POLICY IF EXISTS "Owners can update workspaces" ON public.workspaces;
CREATE POLICY "Owners can update workspaces" ON public.workspaces
    FOR UPDATE TO authenticated USING (public.has_workspace_permission(id, ARRAY['owner'::public.workspace_permission_role]));

-- Workspace Settings Policies
DROP POLICY IF EXISTS "Members can view settings" ON public.workspace_settings;
CREATE POLICY "Members can view settings" ON public.workspace_settings
    FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Owners and admins can update settings" ON public.workspace_settings;
CREATE POLICY "Owners and admins can update settings" ON public.workspace_settings
    FOR UPDATE TO authenticated USING (public.has_workspace_permission(workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role]));

-- Workspace Members Policies
DROP POLICY IF EXISTS "Users can view own membership" ON public.workspace_members;
CREATE POLICY "Users can view own membership" ON public.workspace_members
    FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Members can view other members" ON public.workspace_members;
CREATE POLICY "Members can view other members" ON public.workspace_members
    FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Owners and admins can manage memberships" ON public.workspace_members;
CREATE POLICY "Owners and admins can manage memberships" ON public.workspace_members
    FOR ALL TO authenticated USING (public.has_workspace_permission(workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role]));

-- Workspace Member University Scopes Policies
DROP POLICY IF EXISTS "Users can view own scopes or admins can view all" ON public.workspace_member_university_scopes;
CREATE POLICY "Users can view own scopes or admins can view all" ON public.workspace_member_university_scopes
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 
            FROM public.workspace_members wm 
            WHERE wm.id = workspace_member_id 
              AND (wm.user_id = auth.uid() OR public.has_workspace_permission(wm.workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role]))
        )
    );

DROP POLICY IF EXISTS "Owners and admins can manage scopes" ON public.workspace_member_university_scopes;
CREATE POLICY "Owners and admins can manage scopes" ON public.workspace_member_university_scopes
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 
            FROM public.workspace_members wm 
            WHERE wm.id = workspace_member_id 
              AND public.has_workspace_permission(wm.workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role])
        )
    );

-- Workspace Invitations Policies
DROP POLICY IF EXISTS "Owners, admins and invitees can view invitations" ON public.workspace_invitations;
CREATE POLICY "Owners, admins and invitees can view invitations" ON public.workspace_invitations
    FOR SELECT TO authenticated USING (
        normalized_email = lower(trim(auth.jwt() ->> 'email')) OR
        public.has_workspace_permission(workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role])
    );

DROP POLICY IF EXISTS "Owners and admins can manage invitations" ON public.workspace_invitations;
CREATE POLICY "Owners and admins can manage invitations" ON public.workspace_invitations
    FOR ALL TO authenticated USING (public.has_workspace_permission(workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role]));

-- Hide raw token hash from client select
REVOKE SELECT (token_hash) ON public.workspace_invitations FROM PUBLIC, anon, authenticated;

-- Workspace Invitation University Scopes Policies
DROP POLICY IF EXISTS "Admins and invitees can view invitation scopes" ON public.workspace_invitation_university_scopes;
CREATE POLICY "Admins and invitees can view invitation scopes" ON public.workspace_invitation_university_scopes
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 
            FROM public.workspace_invitations wi 
            WHERE wi.id = workspace_invitation_id 
              AND (wi.normalized_email = lower(trim(auth.jwt() ->> 'email')) OR public.has_workspace_permission(wi.workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role]))
        )
    );

DROP POLICY IF EXISTS "Owners and admins can manage invitation scopes" ON public.workspace_invitation_university_scopes;
CREATE POLICY "Owners and admins can manage invitation scopes" ON public.workspace_invitation_university_scopes
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 
            FROM public.workspace_invitations wi 
            WHERE wi.id = workspace_invitation_id 
              AND public.has_workspace_permission(wi.workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role])
        )
    );

-- Pending Task Assignments Policies
DROP POLICY IF EXISTS "Owners, admins and assignees can view pending assignments" ON public.pending_task_assignments;
CREATE POLICY "Owners, admins and assignees can view pending assignments" ON public.pending_task_assignments
    FOR SELECT TO authenticated USING (
        normalized_email = lower(trim(auth.jwt() ->> 'email')) OR
        public.has_workspace_permission(workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role])
    );

DROP POLICY IF EXISTS "Owners and admins can manage pending assignments" ON public.pending_task_assignments;
CREATE POLICY "Owners and admins can manage pending assignments" ON public.pending_task_assignments
    FOR ALL TO authenticated USING (public.has_workspace_permission(workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role]));

-- =========================================================================
-- 5. Tenant Tables RLS Policies Overrides
-- =========================================================================

-- Drop existing legacy single-tenant policies
DROP POLICY IF EXISTS "Admins have full access to universities" ON public.universities;
DROP POLICY IF EXISTS "Uni representatives can read assigned university" ON public.universities;
DROP POLICY IF EXISTS "Normal roles can read all universities" ON public.universities;

DROP POLICY IF EXISTS "Admins have full access to projects" ON public.projects;
DROP POLICY IF EXISTS "Uni reps can read assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Normal roles can read all projects" ON public.projects;

DROP POLICY IF EXISTS "Admins have full access to businesses" ON public.businesses;
DROP POLICY IF EXISTS "Normal roles can view businesses" ON public.businesses;
DROP POLICY IF EXISTS "Normal roles can update businesses" ON public.businesses;

DROP POLICY IF EXISTS "Admins have full access to contracts" ON public.contracts;

DROP POLICY IF EXISTS "Admins have full access to tasks" ON public.tasks;
DROP POLICY IF EXISTS "Uni reps can read their university tasks" ON public.tasks;
DROP POLICY IF EXISTS "Uni reps can propose tasks for their university" ON public.tasks;
DROP POLICY IF EXISTS "Normal roles can read non-deleted tasks" ON public.tasks;
DROP POLICY IF EXISTS "Normal roles can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Assignees can update their own tasks" ON public.tasks;

DROP POLICY IF EXISTS "Access subtasks based on task access" ON public.subtasks;
DROP POLICY IF EXISTS "Access checklists based on subtask access" ON public.checklists;
DROP POLICY IF EXISTS "Read comments on visible tasks" ON public.task_comments;
DROP POLICY IF EXISTS "Insert comments on visible tasks" ON public.task_comments;
DROP POLICY IF EXISTS "Read join requests on visible tasks" ON public.task_join_requests;
DROP POLICY IF EXISTS "Manage own join requests" ON public.task_join_requests;
DROP POLICY IF EXISTS "Read date change requests on visible tasks" ON public.task_date_change_requests;
DROP POLICY IF EXISTS "Insert own date change requests" ON public.task_date_change_requests;

DROP POLICY IF EXISTS "Read daily updates" ON public.daily_updates;
DROP POLICY IF EXISTS "Create daily updates" ON public.daily_updates;
DROP POLICY IF EXISTS "Update daily updates within 24h" ON public.daily_updates;

DROP POLICY IF EXISTS "Read update versions" ON public.daily_update_versions;
DROP POLICY IF EXISTS "Manage own calendar preferences" ON public.calendar_preferences;

DROP POLICY IF EXISTS "View participating meetings" ON public.meetings;
DROP POLICY IF EXISTS "View attendees of participating meetings" ON public.meeting_attendees;
DROP POLICY IF EXISTS "Update own attendance status" ON public.meeting_attendees;

DROP POLICY IF EXISTS "Read performance scores" ON public.performance_scores;
DROP POLICY IF EXISTS "Read performance metrics" ON public.performance_metrics;
DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can read all notifications" ON public.notifications;

-- Enable RLS (Paranoid schema protection)
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_date_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_update_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5.1 Universities Policies
CREATE POLICY "Select university in workspace" ON public.universities
    FOR SELECT TO authenticated USING (public.can_access_workspace_university(workspace_id, id) AND deleted_at IS NULL);

CREATE POLICY "Admins manage universities" ON public.universities
    FOR ALL TO authenticated USING (public.has_workspace_permission(workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role]));

-- 5.2 Projects Policies
CREATE POLICY "Select project in workspace" ON public.projects
    FOR SELECT TO authenticated USING (public.can_access_workspace_university(workspace_id, university_id) AND deleted_at IS NULL);

CREATE POLICY "Admins and managers manage projects" ON public.projects
    FOR ALL TO authenticated USING (public.has_workspace_permission(workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role, 'manager'::public.workspace_permission_role]));

-- 5.3 Tasks Policies
CREATE POLICY "Select tasks in workspace" ON public.tasks
    FOR SELECT TO authenticated USING (public.can_access_workspace_university(workspace_id, university_id) AND deleted_at IS NULL);

CREATE POLICY "Insert tasks in workspace" ON public.tasks
    FOR INSERT TO authenticated WITH CHECK (
        public.is_active_workspace_member(workspace_id) AND
        public.can_access_workspace_university(workspace_id, university_id) AND
        (
            public.has_workspace_permission(workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role, 'manager'::public.workspace_permission_role]) OR
            (public.current_workspace_permission_role(workspace_id) = 'member'::public.workspace_permission_role)
        )
    );

CREATE POLICY "Update tasks in workspace" ON public.tasks
    FOR UPDATE TO authenticated USING (
        public.is_active_workspace_member(workspace_id) AND
        public.can_access_workspace_university(workspace_id, university_id) AND
        (
            public.has_workspace_permission(workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role, 'manager'::public.workspace_permission_role]) OR
            (primary_assignee_id = auth.uid() OR auth.uid() = ANY(supporters))
        )
    );

CREATE POLICY "Delete tasks in workspace" ON public.tasks
    FOR DELETE TO authenticated USING (public.has_workspace_permission(workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role]));

-- Task fields protection trigger updates
CREATE OR REPLACE FUNCTION public.enforce_task_update_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_role public.workspace_permission_role;
BEGIN
    v_role := public.current_workspace_permission_role(OLD.workspace_id);
    
    -- Owners, Admins, and Managers can edit anything
    IF v_role = 'owner' OR v_role = 'admin' OR v_role = 'manager' THEN
        RETURN NEW;
    END IF;

    -- Members and Guests can only update status, waiting reason, and completion evidence url
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.4 Subtasks Policies
CREATE POLICY "Select subtasks in task workspace" ON public.subtasks
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id 
              AND public.can_access_workspace_university(t.workspace_id, t.university_id)
        )
    );

CREATE POLICY "Manage subtasks in task workspace" ON public.subtasks
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id 
              AND public.can_access_workspace_university(t.workspace_id, t.university_id)
              AND (
                  public.has_workspace_permission(t.workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role, 'manager'::public.workspace_permission_role]) OR
                  (t.primary_assignee_id = auth.uid() OR auth.uid() = ANY(t.supporters))
              )
        )
    );

-- 5.5 Checklists Policies
CREATE POLICY "Select checklists in subtask workspace" ON public.checklists
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.subtasks s
            JOIN public.tasks t ON t.id = s.task_id
            WHERE s.id = subtask_id
              AND public.can_access_workspace_university(t.workspace_id, t.university_id)
        )
    );

CREATE POLICY "Manage checklists in subtask workspace" ON public.checklists
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.subtasks s
            JOIN public.tasks t ON t.id = s.task_id
            WHERE s.id = subtask_id
              AND public.can_access_workspace_university(t.workspace_id, t.university_id)
              AND (
                  public.has_workspace_permission(t.workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role, 'manager'::public.workspace_permission_role]) OR
                  (t.primary_assignee_id = auth.uid() OR auth.uid() = ANY(t.supporters))
              )
        )
    );

-- 5.6 Task Comments Policies
CREATE POLICY "Select comments in task workspace" ON public.task_comments
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
              AND public.can_access_workspace_university(t.workspace_id, t.university_id)
        )
    );

CREATE POLICY "Insert comments in task workspace" ON public.task_comments
    FOR INSERT TO authenticated WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
              AND public.can_access_workspace_university(t.workspace_id, t.university_id)
        )
    );

-- 5.7 Task Join Requests Policies
CREATE POLICY "Select join requests in task workspace" ON public.task_join_requests
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
              AND public.can_access_workspace_university(t.workspace_id, t.university_id)
        )
    );

CREATE POLICY "Manage own join requests" ON public.task_join_requests
    FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins manage join requests" ON public.task_join_requests
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
              AND public.has_workspace_permission(t.workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role])
        )
    );

-- 5.8 Task Date Change Requests Policies
CREATE POLICY "Select date change requests in task workspace" ON public.task_date_change_requests
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
              AND public.can_access_workspace_university(t.workspace_id, t.university_id)
        )
    );

CREATE POLICY "Manage own date change requests" ON public.task_date_change_requests
    FOR ALL TO authenticated USING (requested_by = auth.uid());

CREATE POLICY "Admins manage date change requests" ON public.task_date_change_requests
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
              AND public.has_workspace_permission(t.workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role])
        )
    );

-- 5.9 Businesses Policies
CREATE POLICY "Select businesses in workspace" ON public.businesses
    FOR SELECT TO authenticated USING (
        public.can_access_workspace_university(workspace_id, university_id) AND
        public.current_workspace_job_role(workspace_id) <> 'university_representative'::public.workspace_job_role AND
        deleted_at IS NULL
    );

CREATE POLICY "Admins and managers manage businesses" ON public.businesses
    FOR ALL TO authenticated USING (
        public.has_workspace_permission(workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role, 'manager'::public.workspace_permission_role]) AND
        public.current_workspace_job_role(workspace_id) <> 'university_representative'::public.workspace_job_role
    );

-- 5.10 Contracts Policies (Owner/Admin Only)
CREATE POLICY "Only owners and admins can select contracts" ON public.contracts
    FOR SELECT TO authenticated USING (public.has_workspace_permission(workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role]) AND deleted_at IS NULL);

CREATE POLICY "Only owners and admins can manage contracts" ON public.contracts
    FOR ALL TO authenticated USING (public.has_workspace_permission(workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role]));

-- 5.11 Daily Updates Policies
CREATE POLICY "Select daily updates in workspace" ON public.daily_updates
    FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY "Insert own daily updates in workspace" ON public.daily_updates
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_active_workspace_member(workspace_id));

CREATE POLICY "Update own daily updates in workspace" ON public.daily_updates
    FOR UPDATE TO authenticated USING (
        user_id = auth.uid() AND created_at > (now() - INTERVAL '24 hours') AND public.is_active_workspace_member(workspace_id)
    ) WITH CHECK (
        user_id = auth.uid()
    );

-- 5.12 Daily Update Versions Policies (Parent Daily Update check RLS)
CREATE POLICY "Select daily update versions" ON public.daily_update_versions
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.daily_updates du
            WHERE du.id = daily_update_id
              AND public.is_active_workspace_member(du.workspace_id)
        )
    );

-- 5.13 Calendar Preferences Policies
DROP POLICY IF EXISTS "Manage own calendar preferences" ON public.calendar_preferences;
CREATE POLICY "Manage own calendar preferences" ON public.calendar_preferences
    FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5.14 Meetings Policies
CREATE POLICY "Select meetings in workspace" ON public.meetings
    FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY "Manage meetings in workspace" ON public.meetings
    FOR ALL TO authenticated USING (public.is_active_workspace_member(workspace_id));

-- 5.15 Meeting Attendees Policies (Parent Meeting check RLS)
CREATE POLICY "Select meeting attendees in workspace" ON public.meeting_attendees
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_id
              AND public.is_active_workspace_member(m.workspace_id)
        )
    );

CREATE POLICY "Manage attendees in workspace" ON public.meeting_attendees
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_id
              AND public.is_active_workspace_member(m.workspace_id)
        )
    );

-- 5.16 Notifications Policies (User and Workspace specific checks)
CREATE POLICY "Users can read own global notifications" ON public.notifications
    FOR SELECT TO authenticated USING (user_id = auth.uid() AND notification_scope = 'global');

CREATE POLICY "Users can read own workspace notifications if active member" ON public.notifications
    FOR SELECT TO authenticated USING (user_id = auth.uid() AND notification_scope = 'workspace' AND public.is_active_workspace_member(workspace_id));

CREATE POLICY "Users can only create notifications for themselves" ON public.notifications
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5.17 Performance Scores Policies
CREATE POLICY "Select performance scores in workspace" ON public.performance_scores
    FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY "Owners and admins can manage performance scores" ON public.performance_scores
    FOR ALL TO authenticated USING (public.has_workspace_permission(workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role]));

-- 5.18 Performance Metrics Policies
CREATE POLICY "Select performance metrics in workspace" ON public.performance_metrics
    FOR SELECT TO authenticated USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY "Owners and admins can manage performance metrics" ON public.performance_metrics
    FOR ALL TO authenticated USING (public.has_workspace_permission(workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role]));

-- 5.19 Audit Logs Policies
CREATE POLICY "Owners and admins can view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (workspace_id IS NULL OR public.has_workspace_permission(workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role]));

-- 5.20 Profiles Policies
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can select profiles" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- 5.21 User Devices Policies
DROP POLICY IF EXISTS "Admins have full access to devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users have full access to their own devices" ON public.user_devices;

CREATE POLICY "Users can manage own devices" ON public.user_devices
    FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5.22 User Leaves Policies
DROP POLICY IF EXISTS "Admins have full access to user leaves" ON public.user_leaves;
DROP POLICY IF EXISTS "Everyone can read user leaves" ON public.user_leaves;
DROP POLICY IF EXISTS "Users can manage their own leaves" ON public.user_leaves;

CREATE POLICY "Authenticated users can view leaves" ON public.user_leaves
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own leaves" ON public.user_leaves
    FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =========================================================================
-- 6. Workspace API RPC Functions
-- =========================================================================

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

    -- 7. Add creator as owner
    INSERT INTO public.workspace_members (workspace_id, user_id, permission_role, job_role, membership_status)
    VALUES (v_workspace_id, auth.uid(), 'owner', 'custom', 'active');

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

REVOKE EXECUTE ON FUNCTION public.create_workspace_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_workspace_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;


CREATE OR REPLACE FUNCTION public.list_current_user_workspaces()
RETURNS TABLE (
    workspace_id UUID,
    name TEXT,
    slug TEXT,
    logo_url TEXT,
    permission_role public.workspace_permission_role,
    job_role public.workspace_job_role,
    membership_status public.workspace_membership_status,
    access_expires_at TIMESTAMPTZ,
    is_last_active BOOLEAN,
    requires_mfa BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id AS workspace_id,
        w.name,
        w.slug,
        w.logo_url,
        wm.permission_role,
        wm.job_role,
        wm.membership_status,
        wm.access_expires_at,
        (p.last_active_workspace_id = w.id) AS is_last_active,
        CASE 
            WHEN wm.permission_role = 'owner' THEN COALESCE(ws.require_mfa_for_owner, false)
            WHEN wm.permission_role = 'admin' THEN COALESCE(ws.require_mfa_for_admin, false)
            WHEN wm.permission_role = 'manager' THEN COALESCE(ws.require_mfa_for_manager, false)
            ELSE false
        END AS requires_mfa
    FROM public.workspace_members wm
    JOIN public.workspaces w ON w.id = wm.workspace_id
    JOIN public.profiles p ON p.id = wm.user_id
    LEFT JOIN public.workspace_settings ws ON ws.workspace_id = w.id
    WHERE wm.user_id = auth.uid()
      AND wm.deleted_at IS NULL
      AND w.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE EXECUTE ON FUNCTION public.list_current_user_workspaces() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_current_user_workspaces() TO authenticated;


CREATE OR REPLACE FUNCTION public.list_current_user_pending_workspace_invitations()
RETURNS TABLE (
    invitation_id UUID,
    workspace_name TEXT,
    workspace_logo TEXT,
    invited_by_name TEXT,
    permission_role public.workspace_permission_role,
    job_role public.workspace_job_role,
    custom_job_role TEXT,
    department TEXT,
    university_scopes JSON,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    access_expires_at TIMESTAMPTZ
) AS $$
DECLARE
    v_email TEXT;
BEGIN
    v_email := lower(trim(auth.jwt() ->> 'email'));
    RETURN QUERY
    SELECT 
        wi.id AS invitation_id,
        w.name AS workspace_name,
        w.logo_url AS workspace_logo,
        p.full_name AS invited_by_name,
        wi.permission_role,
        wi.job_role,
        wi.custom_job_role,
        wi.department,
        COALESCE(
            (SELECT json_agg(json_build_object('id', u.id, 'name', u.name))
             FROM public.workspace_invitation_university_scopes wius
             JOIN public.universities u ON u.id = wius.university_id
             WHERE wius.workspace_invitation_id = wi.id),
            '[]'::json
        ) AS university_scopes,
        wi.created_at,
        wi.expires_at,
        wi.access_expires_at
    FROM public.workspace_invitations wi
    JOIN public.workspaces w ON w.id = wi.workspace_id
    LEFT JOIN public.profiles p ON p.id = wi.invited_by
    WHERE wi.normalized_email = v_email
      AND wi.invitation_status = 'pending'::public.workspace_invitation_status
      AND (wi.expires_at IS NULL OR wi.expires_at > now())
      AND w.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE EXECUTE ON FUNCTION public.list_current_user_pending_workspace_invitations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_current_user_pending_workspace_invitations() TO authenticated;


CREATE OR REPLACE FUNCTION public.accept_current_user_workspace_invitation(p_invitation_id UUID)
RETURNS JSON AS $$
DECLARE
    v_email TEXT;
    v_invitation RECORD;
    v_member_id UUID;
    v_assignment RECORD;
BEGIN
    -- 1. Get authenticated user email from JWT
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

    -- 3. Validate email matches
    IF v_invitation.normalized_email <> v_email THEN
        RAISE EXCEPTION 'Unauthorized: Invitation email mismatch' USING ERRCODE = '42501';
    END IF;

    -- 4. Validate status is pending and not expired
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

    -- 5. Create or reactivate membership (idempotent matching specific partial unique index)
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

    -- 6. Map scopes
    INSERT INTO public.workspace_member_university_scopes (workspace_member_id, university_id, created_by)
    SELECT v_member_id, university_id, auth.uid()
    FROM public.workspace_invitation_university_scopes
    WHERE workspace_invitation_id = p_invitation_id
    ON CONFLICT (workspace_member_id, university_id) DO NOTHING;

    -- 7. Map pending task assignments
    FOR v_assignment IN 
        SELECT * FROM public.pending_task_assignments
        WHERE workspace_invitation_id = p_invitation_id AND resolved_at IS NULL
    LOOP
        IF v_assignment.assignment_role = 'primary_assignee' THEN
            UPDATE public.tasks
            SET primary_assignee_id = auth.uid(),
                updated_at = now()
            WHERE id = v_assignment.task_id AND workspace_id = v_assignment.workspace_id;
        ELSIF v_assignment.assignment_role = 'supporter' THEN
            UPDATE public.tasks
            SET supporters = array_append(supporters, auth.uid()),
                updated_at = now()
            WHERE id = v_assignment.task_id AND workspace_id = v_assignment.workspace_id
              AND NOT (auth.uid() = ANY(supporters));
        END IF;

        -- Mark resolved
        UPDATE public.pending_task_assignments
        SET resolved_user_id = auth.uid(),
            resolved_at = now()
        WHERE id = v_assignment.id;
    END LOOP;

    -- 8. Mark invitation accepted
    UPDATE public.workspace_invitations
    SET invitation_status = 'accepted'::public.workspace_invitation_status,
        accepted_at = now(),
        updated_at = now()
    WHERE id = p_invitation_id;

    -- 9. Update last active workspace
    UPDATE public.profiles
    SET last_active_workspace_id = COALESCE(last_active_workspace_id, v_invitation.workspace_id)
    WHERE id = auth.uid();

    -- 10. Generate notification
    INSERT INTO public.notifications (user_id, workspace_id, title, body, notification_scope)
    VALUES (
        auth.uid(),
        v_invitation.workspace_id,
        'Ekibe katıldınız',
        'Çalışma alanına başarıyla katıldınız.',
        'workspace'
    );

    -- 11. Audit log
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_catalog;

REVOKE EXECUTE ON FUNCTION public.accept_current_user_workspace_invitation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_current_user_workspace_invitation(UUID) TO authenticated;


CREATE OR REPLACE FUNCTION public.accept_workspace_invitation_by_token(p_raw_token TEXT)
RETURNS JSON AS $$
DECLARE
    v_token_hash TEXT;
    v_invitation_id UUID;
BEGIN
    -- Compute hash using pgcrypto digest explicitly prefixed by extensions schema
    v_token_hash := encode(extensions.digest(p_raw_token, 'sha256'), 'hex');

    -- Find matching invitation
    SELECT id INTO v_invitation_id
    FROM public.workspace_invitations
    WHERE token_hash = v_token_hash;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid token';
    END IF;

    -- Execute internal accept logic
    RETURN public.accept_current_user_workspace_invitation(v_invitation_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_catalog;

REVOKE EXECUTE ON FUNCTION public.accept_workspace_invitation_by_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invitation_by_token(TEXT) TO authenticated;


CREATE OR REPLACE FUNCTION public.decline_current_user_workspace_invitation(p_invitation_id UUID)
RETURNS JSON AS $$
DECLARE
    v_email TEXT;
    v_invitation RECORD;
BEGIN
    v_email := lower(trim(auth.jwt() ->> 'email'));
    IF v_email IS NULL OR v_email = '' THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_invitation
    FROM public.workspace_invitations
    WHERE id = p_invitation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found';
    END IF;

    IF v_invitation.normalized_email <> v_email THEN
        RAISE EXCEPTION 'Unauthorized: Email mismatch' USING ERRCODE = '42501';
    END IF;

    IF v_invitation.invitation_status <> 'pending'::public.workspace_invitation_status THEN
        RETURN json_build_object('success', true, 'message', 'Invitation already processed');
    END IF;

    UPDATE public.workspace_invitations
    SET invitation_status = 'declined'::public.workspace_invitation_status,
        declined_at = now(),
        updated_at = now()
    WHERE id = p_invitation_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE EXECUTE ON FUNCTION public.decline_current_user_workspace_invitation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decline_current_user_workspace_invitation(UUID) TO authenticated;


CREATE OR REPLACE FUNCTION public.set_current_user_active_workspace(p_target_workspace_id UUID)
RETURNS JSON AS $$
BEGIN
    -- Verify active membership
    IF NOT public.is_active_workspace_member(p_target_workspace_id) THEN
        RAISE EXCEPTION 'Access denied: You are not an active member of this workspace' USING ERRCODE = '42501';
    END IF;

    -- Update active workspace state
    UPDATE public.profiles
    SET last_active_workspace_id = p_target_workspace_id
    WHERE id = auth.uid();

    RETURN json_build_object(
        'success', true,
        'workspace_id', p_target_workspace_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE EXECUTE ON FUNCTION public.set_current_user_active_workspace(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_current_user_active_workspace(UUID) TO authenticated;


CREATE OR REPLACE FUNCTION public.transfer_workspace_ownership(
    p_target_workspace_id UUID,
    p_target_member_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_caller_role public.workspace_permission_role;
    v_caller_member_id UUID;
    v_target_member RECORD;
BEGIN
    -- 1. Lock caller membership details
    SELECT id, permission_role INTO v_caller_member_id, v_caller_role
    FROM public.workspace_members
    WHERE workspace_id = p_target_workspace_id 
      AND user_id = auth.uid()
      AND membership_status = 'active'
      AND deleted_at IS NULL
    FOR UPDATE;

    IF v_caller_role <> 'owner' THEN
        RAISE EXCEPTION 'Access denied: Only the workspace owner can transfer ownership' USING ERRCODE = '42501';
    END IF;

    -- 2. Lock target membership details
    SELECT * INTO v_target_member
    FROM public.workspace_members
    WHERE id = p_target_member_id 
      AND workspace_id = p_target_workspace_id
      AND membership_status = 'active'
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target member not found or inactive';
    END IF;

    IF v_target_member.user_id = auth.uid() THEN
        RAISE EXCEPTION 'Target member is already the owner';
    END IF;

    -- 3. Promote target to owner
    UPDATE public.workspace_members
    SET permission_role = 'owner'::public.workspace_permission_role,
        updated_at = now()
    WHERE id = p_target_member_id;

    -- 4. Demote caller to admin
    UPDATE public.workspace_members
    SET permission_role = 'admin'::public.workspace_permission_role,
        updated_at = now()
    WHERE id = v_caller_member_id;

    -- 5. Log audit trail
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, payload, workspace_id)
    VALUES (
        auth.uid(),
        'OWNER_TRANSFER',
        'workspace_members',
        p_target_member_id,
        json_build_object('from_member_id', v_caller_member_id, 'to_member_id', p_target_member_id),
        p_target_workspace_id
    );

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE EXECUTE ON FUNCTION public.transfer_workspace_ownership(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_workspace_ownership(UUID, UUID) TO authenticated;


CREATE OR REPLACE FUNCTION public.leave_current_user_workspace(p_target_workspace_id UUID)
RETURNS JSON AS $$
DECLARE
    v_member RECORD;
    v_new_active_ws UUID;
BEGIN
    -- 1. Lock user membership details
    SELECT * INTO v_member
    FROM public.workspace_members
    WHERE workspace_id = p_target_workspace_id
      AND user_id = auth.uid()
      AND membership_status = 'active'
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Membership not found or inactive';
    END IF;

    -- 2. Mark membership_status as left (triggers safety checks automatically)
    UPDATE public.workspace_members
    SET membership_status = 'left'::public.workspace_membership_status,
        updated_at = now()
    WHERE id = v_member.id;

    -- 3. Switch last active workspace in profile if currently pointing here
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND last_active_workspace_id = p_target_workspace_id) THEN
        -- Find another active workspace membership
        SELECT workspace_id INTO v_new_active_ws
        FROM public.workspace_members
        WHERE user_id = auth.uid()
          AND workspace_id <> p_target_workspace_id
          AND membership_status = 'active'
          AND deleted_at IS NULL
        LIMIT 1;

        UPDATE public.profiles
        SET last_active_workspace_id = v_new_active_ws
        WHERE id = auth.uid();
    END IF;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE EXECUTE ON FUNCTION public.leave_current_user_workspace(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_current_user_workspace(UUID) TO authenticated;


CREATE OR REPLACE FUNCTION public.current_user_workspace_mfa_requirement(p_workspace_id UUID)
RETURNS JSON AS $$
DECLARE
    v_role public.workspace_permission_role;
    v_mfa_required BOOLEAN;
BEGIN
    SELECT permission_role INTO v_role
    FROM public.workspace_members
    WHERE workspace_id = p_workspace_id 
      AND user_id = auth.uid()
      AND membership_status = 'active'
      AND deleted_at IS NULL;
      
    IF v_role IS NULL THEN
        RETURN json_build_object('required', false, 'reason', 'NOT_MEMBER');
    END IF;

    SELECT 
        CASE 
            WHEN v_role = 'owner' THEN COALESCE(require_mfa_for_owner, false)
            WHEN v_role = 'admin' THEN COALESCE(require_mfa_for_admin, false)
            WHEN v_role = 'manager' THEN COALESCE(require_mfa_for_manager, false)
            ELSE false
        END INTO v_mfa_required
    FROM public.workspace_settings
    WHERE workspace_id = p_workspace_id;

    RETURN json_build_object(
        'required', COALESCE(v_mfa_required, false),
        'role', v_role,
        'session_aal', auth.jwt() ->> 'aal'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE EXECUTE ON FUNCTION public.current_user_workspace_mfa_requirement(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_workspace_mfa_requirement(UUID) TO authenticated;

-- =========================================================================
-- 7. Redefine register_current_device dynamically using global scope notification
-- =========================================================================

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

    -- Create new device notification record (Using global scope without workspace_id requirement)
    INSERT INTO public.notifications (user_id, title, body, notification_scope, workspace_id)
    VALUES (
        auth.uid(),
        'Yeni cihaz girişi',
        'Cihaz Adı: ' || COALESCE(p_device_name, 'Bilinmiyor') || ', Platform: ' || COALESCE(p_platform, 'Bilinmiyor') || ', Sürüm: ' || COALESCE(p_app_version, 'Bilinmiyor') || ', Tarih: ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
        'global'::public.notification_scope,
        NULL
    );
    
    RETURN json_build_object('success', true, 'device_id', v_new_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- =========================================================================
-- 8. Legacy Allowlist access_invitations Restrictions
-- =========================================================================
REVOKE INSERT, UPDATE, DELETE ON public.access_invitations FROM authenticated, anon, public;

-- =========================================================================
-- 9. Varsayılan Kampüs Kapında Owner Bootstrap
-- =========================================================================

DO $$
DECLARE
    v_user_id UUID;
    v_default_ws_id UUID := 'df39e73b-bf72-4d1a-9694-82bd8996b797';
    v_email TEXT := 'resultankilic.business@gmail.com';
    v_inv_token TEXT := 'owner_bootstrap_token_secret_123';
    v_token_hash TEXT;
BEGIN
    -- Compute hash using pgcrypto digest explicitly prefixed by extensions schema
    v_token_hash := encode(extensions.digest(v_inv_token || '_seed', 'sha256'), 'hex');

    -- Check if user exists in auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- Promote to active owner of default workspace
        INSERT INTO public.workspace_members (
            workspace_id,
            user_id,
            permission_role,
            job_role,
            custom_job_role,
            membership_status,
            joined_at
        )
        VALUES (
            v_default_ws_id,
            v_user_id,
            'owner',
            'custom',
            'Owner',
            'active',
            now()
        )
        ON CONFLICT (workspace_id, user_id) 
        WHERE (deleted_at IS NULL AND membership_status IN ('active'::public.workspace_membership_status, 'invited'::public.workspace_membership_status, 'suspended'::public.workspace_membership_status))
        DO UPDATE SET permission_role = 'owner', membership_status = 'active', deleted_at = NULL;

        UPDATE public.profiles
        SET last_active_workspace_id = v_default_ws_id
        WHERE id = v_user_id;
    ELSE
        -- Owner user does not exist yet. Check if a pending owner invitation already exists for default workspace
        IF NOT EXISTS (
            SELECT 1 
            FROM public.workspace_invitations 
            WHERE workspace_id = v_default_ws_id 
              AND normalized_email = v_email 
              AND invitation_status = 'pending'::public.workspace_invitation_status
        ) THEN
            INSERT INTO public.workspace_invitations (
                workspace_id,
                normalized_email,
                token_hash,
                permission_role,
                job_role,
                custom_job_role,
                invitation_status,
                expires_at
            )
            VALUES (
                v_default_ws_id,
                v_email,
                v_token_hash,
                'owner',
                'custom',
                'Owner',
                'pending',
                now() + INTERVAL '1 year'
            );
        END IF;
    END IF;
END $$;
