-- Migration: Performance Optimizations & Schema Indexes Cleanup
-- Date: 2026-07-23

-- 1. Optimize Workspace Security Helper Functions with STABLE volatile attribute
-- STABLE allows PostgreSQL query planner to cache function output per statement during RLS evaluation.

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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog;


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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog;


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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog;


CREATE OR REPLACE FUNCTION public.has_workspace_permission(
    target_workspace_id UUID,
    required_role public.workspace_permission_role
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_role public.workspace_permission_role;
BEGIN
    v_current_role := public.current_workspace_permission_role(target_workspace_id);
    IF v_current_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    IF v_current_role = 'owner' THEN
        RETURN TRUE;
    ELSIF v_current_role = 'admin' AND required_role IN ('admin', 'member', 'guest') THEN
        RETURN TRUE;
    ELSIF v_current_role = 'member' AND required_role IN ('member', 'guest') THEN
        RETURN TRUE;
    ELSIF v_current_role = 'guest' AND required_role = 'guest' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog;


CREATE OR REPLACE FUNCTION public.can_access_workspace_university(
    target_workspace_id UUID,
    target_university_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_member_id UUID;
    v_job_role public.workspace_job_role;
BEGIN
    SELECT id, job_role INTO v_member_id, v_job_role
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

    -- Workspace Owner, Operations Manager, and Headquarters Admin can access all universities in workspace
    IF v_job_role IN ('workspace_owner', 'operations_manager', 'headquarters_admin') THEN
        RETURN TRUE;
    END IF;

    -- Representatives can only access explicitly scoped universities
    RETURN EXISTS (
        SELECT 1 
        FROM public.workspace_member_university_scopes
        WHERE workspace_member_id = v_member_id
          AND university_id = target_university_id
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog;


-- 2. Add High-Performance Compound Indexes for Tenant Tables

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_ws_active 
ON public.workspace_members(user_id, workspace_id, membership_status) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_daily_updates_ws_created 
ON public.daily_updates(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_ws_status_priority 
ON public.tasks(workspace_id, status, priority);

CREATE INDEX IF NOT EXISTS idx_businesses_ws_stage 
ON public.businesses(workspace_id, stage);

CREATE INDEX IF NOT EXISTS idx_audit_logs_ws_created 
ON public.audit_logs(workspace_id, created_at DESC);
