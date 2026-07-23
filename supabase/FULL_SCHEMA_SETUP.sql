-- ============================================================
-- KAMPUS KAPINDA CRM — TAM SCHEMA KURULUM DOSYASI
-- Supabase Dashboard > SQL Editor'a yapistir ve calistir
-- Olusturulma: 2026-07-24 01:38
-- ============================================================


-- ──────────────────────────────────────────────────────────
-- 20260710120000_init_schema.sql
-- ──────────────────────────────────────────────────────────
-- Create Custom PostgreSQL Types (Enums)
CREATE TYPE user_role AS ENUM (
    'admin',
    'operations',
    'marketing',
    'social_media',
    'video_editor',
    'software',
    'university_representative',
    'courier_operations',
    'intern',
    'freelancer'
);

CREATE TYPE task_priority AS ENUM (
    'low',
    'normal',
    'high',
    'critical'
);

CREATE TYPE task_status AS ENUM (
    'planned',
    'todo',
    'in_progress',
    'waiting',
    'review',
    'revision_required',
    'completed',
    'cancelled'
);

CREATE TYPE business_stage AS ENUM (
    'discovered',
    'visit_planned',
    'contact_identified',
    'contacted',
    'meeting_scheduled',
    'meeting_completed',
    'follow_up',
    'integration_discussion',
    'agreement_reached',
    'contract_completed',
    'menu_transfer',
    'system_installation',
    'whatsapp_group',
    'advertising_planning',
    'activated',
    'advertising_published',
    'active',
    'rejected',
    'paused'
);

CREATE TYPE performance_period AS ENUM (
    'weekly',
    'monthly',
    'quarterly',
    'semiannual',
    'annual'
);

CREATE TYPE request_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);

-- 1. Access invitations (Google login allowlist)
CREATE TABLE access_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    invited_role user_role NOT NULL DEFAULT 'intern',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Profiles (links to auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY, -- Will refer to auth.users.id
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'intern',
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. User Devices (Tracks active devices, enforces max 2 limit)
CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    device_token TEXT NOT NULL UNIQUE,
    device_name TEXT,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. User Leaves (Vacation listing for daily update exemptions)
CREATE TABLE user_leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_leave_dates CHECK (start_date <= end_date)
);

-- 5. Universities
CREATE TABLE universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    city TEXT NOT NULL,
    logo_url TEXT,
    drive_folder_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- 6. Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- 7. Businesses (CRM Staging)
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    stage business_stage NOT NULL DEFAULT 'discovered',
    authorized_person_name TEXT,
    authorized_person_phone TEXT,
    authorized_person_email TEXT,
    meeting_notes TEXT,
    next_followup_date DATE,
    assigned_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    commission_rate NUMERIC(5, 2) DEFAULT 0.00,
    contract_start_date DATE,
    contract_end_date DATE,
    system_installation_status TEXT,
    whatsapp_group_link TEXT,
    activation_status TEXT,
    marketing_status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- 8. Contracts (Only viewable by admin roles)
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
    document_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- 9. Tasks (Project -> Task -> Subtask structure)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    primary_assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    supporters UUID[] NOT NULL DEFAULT '{}',
    start_date DATE,
    due_date DATE,
    priority task_priority NOT NULL DEFAULT 'normal',
    status task_status NOT NULL DEFAULT 'planned',
    effort_score INT CHECK (effort_score >= 1 AND effort_score <= 5),
    completion_evidence_required BOOLEAN NOT NULL DEFAULT false,
    completion_evidence_url TEXT,
    waiting_reason TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT task_date_sanity CHECK (start_date <= due_date),
    CONSTRAINT task_waiting_reason_check CHECK (
        (status = 'waiting' AND waiting_reason IS NOT NULL AND trim(waiting_reason) <> '') OR
        (status <> 'waiting')
    )
);

-- 10. Subtasks
CREATE TABLE subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Checklists
CREATE TABLE checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subtask_id UUID NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
    item_text TEXT NOT NULL,
    is_checked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Task Comments
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Task Join Requests (Requests by user to join specific tasks)
CREATE TABLE task_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status request_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (task_id, user_id)
);

-- 14. Task Date Change Requests (Date change proposal screen)
CREATE TABLE task_date_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    proposed_due_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status request_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Daily Updates
CREATE TABLE daily_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    completed_today TEXT NOT NULL,
    ongoing_work TEXT NOT NULL,
    blockers TEXT,
    support_needed TEXT,
    tomorrow_plan TEXT NOT NULL,
    related_tasks UUID[] NOT NULL DEFAULT '{}',
    additional_notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    is_late BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Daily Update Versions (History tracker)
CREATE TABLE daily_update_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_update_id UUID NOT NULL REFERENCES daily_updates(id) ON DELETE CASCADE,
    version_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. Calendar Preferences
CREATE TABLE calendar_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    working_hours_start TIME NOT NULL DEFAULT '09:00:00',
    working_hours_end TIME NOT NULL DEFAULT '18:00:00',
    campus_buffer_minutes INT NOT NULL DEFAULT 15,
    inter_campus_buffer_minutes INT NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. Meetings
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    google_calendar_event_id TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT meeting_time_sanity CHECK (start_time <= end_time)
);

-- 19. Meeting Attendees
CREATE TABLE meeting_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'tentative' CHECK (status IN ('accepted', 'declined', 'tentative')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (meeting_id, user_id)
);

-- 20. Performance Scores
CREATE TABLE performance_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    period performance_period NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    score NUMERIC(5, 2) NOT NULL CHECK (score >= 0.00 AND score <= 100.00),
    admin_evaluation_score NUMERIC(5, 2) NOT NULL CHECK (admin_evaluation_score >= 0.00 AND admin_evaluation_score <= 20.00),
    written_review TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT performance_date_sanity CHECK (start_date <= end_date)
);

-- 21. Performance Metrics (Telemetry metrics for first 3 weeks and ongoing)
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC(10, 2) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 22. Audit Logs (Audits system changes)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ALTER PROFILES FOR UNIVERSITY ASSOCIATION (REPRESENTATIVE ROLE)
ALTER TABLE profiles ADD COLUMN university_id UUID REFERENCES universities(id) ON DELETE SET NULL;

-- CREATE INDEXES FOR FAST RETRIEVAL
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_university ON profiles(university_id);
CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_universities_deleted_at ON universities(deleted_at);
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at);
CREATE INDEX idx_businesses_deleted_at ON businesses(deleted_at);
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_primary_assignee ON tasks(primary_assignee_id);
CREATE INDEX idx_daily_updates_user_id ON daily_updates(user_id);
CREATE INDEX idx_daily_updates_created_at ON daily_updates(created_at);
CREATE INDEX idx_meetings_time ON meetings(start_time, end_time);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);



-- ──────────────────────────────────────────────────────────
-- 20260710130000_triggers.sql
-- ──────────────────────────────────────────────────────────
-- 1. Function to update updated_at timestamp column automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind updated_at trigger to tables
CREATE TRIGGER tr_access_invitations_updated_at BEFORE UPDATE ON access_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_universities_updated_at BEFORE UPDATE ON universities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_subtasks_updated_at BEFORE UPDATE ON subtasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_checklists_updated_at BEFORE UPDATE ON checklists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_daily_updates_updated_at BEFORE UPDATE ON daily_updates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_calendar_preferences_updated_at BEFORE UPDATE ON calendar_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_meetings_updated_at BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 2. Auth user creation sync trigger and allowlist check
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role user_role;
    v_full_name TEXT;
    v_invited_role user_role;
BEGIN
    -- Derive a display name
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    
    -- Automatic owner/admin assignment
    IF NEW.email = 'resultankilic.business@gmail.com' THEN
        v_role := 'admin';
        -- Ensure owner is in the allowlist
        INSERT INTO public.access_invitations (email, status, invited_role)
        VALUES (NEW.email, 'active', 'admin')
        ON CONFLICT (email) DO UPDATE SET status = 'active', invited_role = 'admin';
    ELSE
        -- Check if user is in active allowlist
        SELECT invited_role INTO v_invited_role 
        FROM public.access_invitations 
        WHERE email = NEW.email AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now());
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Access denied: Email address % is not in the allowlist or invitation expired.', NEW.email;
        END IF;
        
        v_role := v_invited_role;
    END IF;

    -- Sync user profile record
    INSERT INTO public.profiles (id, email, role, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        v_role,
        v_full_name,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET 
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url;
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. Critical Table Auditing Trigger (Audit logs log deletions, edits, inserts)
CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_payload JSONB;
BEGIN
    -- Extract active session uid
    v_user_id := auth.uid();
    
    IF (TG_OP = 'DELETE') THEN
        v_payload := to_jsonb(OLD);
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, payload)
        VALUES (v_user_id, TG_OP, TG_TABLE_NAME, OLD.id, v_payload);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_payload := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, payload)
        VALUES (v_user_id, TG_OP, TG_TABLE_NAME, NEW.id, v_payload);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        v_payload := to_jsonb(NEW);
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, payload)
        VALUES (v_user_id, TG_OP, TG_TABLE_NAME, NEW.id, v_payload);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind audit logs trigger to critical tables
CREATE TRIGGER tr_audit_tasks AFTER INSERT OR UPDATE OR DELETE ON tasks FOR EACH ROW EXECUTE FUNCTION audit_log_changes();
CREATE TRIGGER tr_audit_businesses AFTER INSERT OR UPDATE OR DELETE ON businesses FOR EACH ROW EXECUTE FUNCTION audit_log_changes();
CREATE TRIGGER tr_audit_contracts AFTER INSERT OR UPDATE OR DELETE ON contracts FOR EACH ROW EXECUTE FUNCTION audit_log_changes();


-- 4. Daily Update Version Tracking Trigger
CREATE OR REPLACE FUNCTION public.track_daily_update_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Log old state version before writing updates
    INSERT INTO public.daily_update_versions (daily_update_id, version_data)
    VALUES (NEW.id, to_jsonb(OLD));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_track_daily_update_history
    BEFORE UPDATE ON daily_updates
    FOR EACH ROW EXECUTE FUNCTION public.track_daily_update_history();



-- ──────────────────────────────────────────────────────────
-- 20260710140000_rls_policies.sql
-- ──────────────────────────────────────────────────────────
-- 1. Security helper functions to resolve auth details safely
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role AS $$
DECLARE
    v_role public.user_role;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_user_university()
RETURNS UUID AS $$
DECLARE
    v_uni_id UUID;
BEGIN
    SELECT university_id INTO v_uni_id FROM public.profiles WHERE id = auth.uid();
    RETURN v_uni_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Enable Row-Level Security on all tables
ALTER TABLE access_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_date_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_update_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;


-- 3. Access Invitations Policies
CREATE POLICY "Admins have full access to invitations" ON access_invitations FOR ALL TO authenticated USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Users can view their own invitation" ON access_invitations FOR SELECT TO authenticated USING (email = auth.jwt() ->> 'email');


-- 4. Profiles Policies
CREATE POLICY "Admins have full access to profiles" ON profiles FOR ALL TO authenticated USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Authenticated users can view profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());


-- 5. User Devices Policies
CREATE POLICY "Admins have full access to devices" ON user_devices FOR ALL TO authenticated USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Users have full access to their own devices" ON user_devices FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- 6. User Leaves Policies
CREATE POLICY "Admins have full access to user leaves" ON user_leaves FOR ALL TO authenticated USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Everyone can read user leaves" ON user_leaves FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage their own leaves" ON user_leaves FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- 7. Universities Policies
CREATE POLICY "Admins have full access to universities" ON universities FOR ALL TO authenticated USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Uni representatives can read assigned university" ON universities FOR SELECT TO authenticated USING (
    public.get_current_user_role() = 'university_representative' 
    AND id = public.get_current_user_university() 
    AND deleted_at IS NULL
);
CREATE POLICY "Normal roles can read all universities" ON universities FOR SELECT TO authenticated USING (
    public.get_current_user_role() NOT IN ('university_representative') 
    AND deleted_at IS NULL
);


-- 8. Projects Policies
CREATE POLICY "Admins have full access to projects" ON projects FOR ALL TO authenticated USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Uni reps can read assigned projects" ON projects FOR SELECT TO authenticated USING (
    public.get_current_user_role() = 'university_representative' 
    AND university_id = public.get_current_user_university() 
    AND deleted_at IS NULL
);
CREATE POLICY "Normal roles can read all projects" ON projects FOR SELECT TO authenticated USING (
    public.get_current_user_role() NOT IN ('university_representative') 
    AND deleted_at IS NULL
);


-- 9. Businesses (CRM) Policies
CREATE POLICY "Admins have full access to businesses" ON businesses FOR ALL TO authenticated USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Normal roles can view businesses" ON businesses FOR SELECT TO authenticated USING (
    public.get_current_user_role() NOT IN ('university_representative') AND deleted_at IS NULL
);

CREATE POLICY "Normal roles can update businesses" ON businesses FOR UPDATE TO authenticated USING (
    public.get_current_user_role() NOT IN ('university_representative') AND deleted_at IS NULL
) WITH CHECK (
    public.get_current_user_role() NOT IN ('university_representative') AND deleted_at IS NULL
);


-- 10. Contracts Policies (Strictly Admin-Only)
CREATE POLICY "Admins have full access to contracts" ON contracts FOR ALL TO authenticated USING (public.get_current_user_role() = 'admin');


-- 11. Tasks Policies
CREATE POLICY "Admins have full access to tasks" ON tasks FOR ALL TO authenticated USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Uni reps can read their university tasks" ON tasks FOR SELECT TO authenticated USING (
    public.get_current_user_role() = 'university_representative' 
    AND university_id = public.get_current_user_university() 
    AND deleted_at IS NULL
);
CREATE POLICY "Uni reps can propose tasks for their university" ON tasks FOR INSERT TO authenticated WITH CHECK (
    public.get_current_user_role() = 'university_representative' 
    AND university_id = public.get_current_user_university()
    AND status = 'planned'
);
CREATE POLICY "Normal roles can read non-deleted tasks" ON tasks FOR SELECT TO authenticated USING (
    public.get_current_user_role() NOT IN ('university_representative')
    AND deleted_at IS NULL
);
CREATE POLICY "Normal roles can insert tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (
    public.get_current_user_role() NOT IN ('university_representative')
);
CREATE POLICY "Assignees can update their own tasks" ON tasks FOR UPDATE TO authenticated USING (
    public.get_current_user_role() NOT IN ('university_representative') 
    AND (primary_assignee_id = auth.uid() OR auth.uid() = ANY(supporters))
    AND deleted_at IS NULL
);

-- Constraint Trigger on Tasks to protect specific columns for non-admins
CREATE OR REPLACE FUNCTION public.enforce_task_update_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Admins can update anything
    IF public.get_current_user_role() = 'admin' THEN
        RETURN NEW;
    END IF;

    -- Non-admins cannot modify critical columns (only status, waiting_reason, and completion evidence url are allowed)
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
        OLD.deleted_at IS DISTINCT FROM NEW.deleted_at) THEN
        RAISE EXCEPTION 'Access denied: Non-admin users are only allowed to update task status, waiting reason, and completion evidence.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_task_field_security
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION public.enforce_task_update_fields();


-- 12. Subtasks & Checklists Policies
CREATE POLICY "Access subtasks based on task access" ON subtasks FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM tasks WHERE id = task_id)
);
CREATE POLICY "Access checklists based on subtask access" ON checklists FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM subtasks WHERE id = subtask_id)
);


-- 13. Task Comments Policies
CREATE POLICY "Read comments on visible tasks" ON task_comments FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM tasks WHERE id = task_id)
);
CREATE POLICY "Insert comments on visible tasks" ON task_comments FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM tasks WHERE id = task_id) 
    AND user_id = auth.uid()
);


-- 14. Task Join Requests Policies
CREATE POLICY "Read join requests on visible tasks" ON task_join_requests FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM tasks WHERE id = task_id)
);
CREATE POLICY "Manage own join requests" ON task_join_requests FOR ALL TO authenticated USING (
    user_id = auth.uid()
);


-- 15. Task Date Change Requests Policies
CREATE POLICY "Read date change requests on visible tasks" ON task_date_change_requests FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM tasks WHERE id = task_id)
);
CREATE POLICY "Insert own date change requests" ON task_date_change_requests FOR INSERT TO authenticated WITH CHECK (
    requested_by = auth.uid()
);


-- 16. Daily Updates Policies
CREATE POLICY "Read daily updates" ON daily_updates FOR SELECT TO authenticated USING (
    status = 'published' OR user_id = auth.uid()
);
CREATE POLICY "Create daily updates" ON daily_updates FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
);
CREATE POLICY "Update daily updates within 24h" ON daily_updates FOR UPDATE TO authenticated USING (
    user_id = auth.uid() AND created_at > (now() - INTERVAL '24 hours')
) WITH CHECK (
    user_id = auth.uid()
);

-- 17. Daily Update Versions Policies
CREATE POLICY "Read update versions" ON daily_update_versions FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM daily_updates WHERE id = daily_update_id)
);


-- 18. Calendar Preferences Policies
CREATE POLICY "Manage own calendar preferences" ON calendar_preferences FOR ALL TO authenticated USING (
    user_id = auth.uid()
);


-- 19. Meetings & Attendees Policies
CREATE POLICY "View participating meetings" ON meetings FOR SELECT TO authenticated USING (
    created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM meeting_attendees WHERE meeting_id = id AND user_id = auth.uid()
    )
);
CREATE POLICY "View attendees of participating meetings" ON meeting_attendees FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM meetings WHERE id = meeting_id AND created_by = auth.uid()
    )
);
CREATE POLICY "Update own attendance status" ON meeting_attendees FOR UPDATE TO authenticated USING (
    user_id = auth.uid()
) WITH CHECK (
    user_id = auth.uid()
);


-- 20. Performance Policies
CREATE POLICY "Read performance scores" ON performance_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read performance metrics" ON performance_metrics FOR SELECT TO authenticated USING (true);


-- 21. Audit Logs Policies (Admin Only)
CREATE POLICY "Admins read audit logs" ON audit_logs FOR SELECT TO authenticated USING (public.get_current_user_role() = 'admin');

-- =========================================================================
-- Schema level grants for Supabase roles (anon, authenticated, service_role)
-- =========================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;



-- ──────────────────────────────────────────────────────────
-- 20260711100000_update_invitations_and_devices.sql
-- ──────────────────────────────────────────────────────────
-- 1. Update access_invitations table columns
ALTER TABLE public.access_invitations RENAME COLUMN invited_role TO role;

ALTER TABLE public.access_invitations ADD COLUMN university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL;

ALTER TABLE public.access_invitations ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
UPDATE public.access_invitations SET is_active = (status = 'active');
ALTER TABLE public.access_invitations DROP COLUMN status;

ALTER TABLE public.access_invitations ADD COLUMN invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.access_invitations ADD COLUMN invited_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.access_invitations ADD COLUMN accepted_at TIMESTAMPTZ;

-- 2. Update user_devices table columns
ALTER TABLE public.user_devices ADD COLUMN device_identifier_hash TEXT UNIQUE;
UPDATE public.user_devices SET device_identifier_hash = device_token;
ALTER TABLE public.user_devices ALTER COLUMN device_identifier_hash SET NOT NULL;
ALTER TABLE public.user_devices DROP COLUMN device_token;

ALTER TABLE public.user_devices ADD COLUMN platform TEXT;
ALTER TABLE public.user_devices ADD COLUMN app_version TEXT;
ALTER TABLE public.user_devices ADD COLUMN first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.user_devices ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.user_devices ADD COLUMN revoked_at TIMESTAMPTZ;
ALTER TABLE public.user_devices ADD COLUMN push_token TEXT;

ALTER TABLE public.user_devices RENAME COLUMN last_active_at TO last_seen_at;

-- 3. Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications" ON public.notifications
    FOR SELECT TO authenticated USING (user_id = auth.uid());
    
CREATE POLICY "Admins can read all notifications" ON public.notifications
    FOR SELECT TO authenticated USING (public.get_current_user_role() = 'admin');

GRANT ALL ON public.notifications TO postgres, anon, authenticated, service_role;

-- 4. Re-create handle_new_user sync trigger function to accommodate new structures
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role public.user_role;
    v_uni_id UUID;
    v_full_name TEXT;
    v_invited_role public.user_role;
BEGIN
    -- Derive a display name
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    
    -- Automatic owner/admin assignment
    IF NEW.email = 'resultankilic.business@gmail.com' THEN
        v_role := 'admin';
        v_uni_id := null;
        -- Ensure owner is in the allowlist
        INSERT INTO public.access_invitations (email, is_active, role)
        VALUES (NEW.email, true, 'admin')
        ON CONFLICT (email) DO UPDATE SET is_active = true, role = 'admin';
    ELSE
        -- Check if user is in active allowlist and retrieve role & university
        SELECT role, university_id INTO v_invited_role, v_uni_id 
        FROM public.access_invitations 
        WHERE email = NEW.email AND is_active = true
        AND (expires_at IS NULL OR expires_at > now());
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Access denied: Email address % is not in the allowlist or invitation expired.', NEW.email;
        END IF;
        
        v_role := v_invited_role;
    END IF;

    -- Sync user profile record
    INSERT INTO public.profiles (id, email, role, full_name, avatar_url, university_id)
    VALUES (
        NEW.id,
        NEW.email,
        v_role,
        v_full_name,
        NEW.raw_user_meta_data->>'avatar_url',
        v_uni_id
    )
    ON CONFLICT (id) DO UPDATE SET 
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        role = EXCLUDED.role,
        university_id = EXCLUDED.university_id;
        
    -- Mark invitation as accepted
    UPDATE public.access_invitations
    SET accepted_at = now()
    WHERE email = NEW.email;
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Secure RPC: check_current_user_access()
CREATE OR REPLACE FUNCTION public.check_current_user_access()
RETURNS json AS $$
DECLARE
    v_email TEXT;
    v_invitation RECORD;
    v_profile RECORD;
BEGIN
    -- Clean the email address from auth context
    v_email := trim(lower(auth.jwt() ->> 'email'));
    
    -- Query the access allowlist
    SELECT * INTO v_invitation 
    FROM public.access_invitations 
    WHERE email = v_email;
    
    -- Check if invited
    IF NOT FOUND THEN
        RETURN json_build_object(
            'allowed', false,
            'reason', 'not_invited',
            'role', null,
            'university_id', null,
            'expires_at', null
        );
    END IF;
    
    -- Check if inactive
    IF v_invitation.is_active = false THEN
        RETURN json_build_object(
            'allowed', false,
            'reason', 'inactive',
            'role', v_invitation.role,
            'university_id', v_invitation.university_id,
            'expires_at', v_invitation.expires_at
        );
    END IF;
    
    -- Check if expired
    IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < now() THEN
        RETURN json_build_object(
            'allowed', false,
            'reason', 'expired',
            'role', v_invitation.role,
            'university_id', v_invitation.university_id,
            'expires_at', v_invitation.expires_at
        );
    END IF;
    
    -- Check if profile exists
    SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
    IF NOT FOUND THEN
        RETURN json_build_object(
            'allowed', false,
            'reason', 'profile_missing',
            'role', v_invitation.role,
            'university_id', v_invitation.university_id,
            'expires_at', v_invitation.expires_at
        );
    END IF;
    
    -- Active and valid
    RETURN json_build_object(
        'allowed', true,
        'reason', 'active',
        'role', v_profile.role,
        'university_id', v_profile.university_id,
        'expires_at', v_invitation.expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.check_current_user_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_current_user_access() TO authenticated;

-- 6. Secure RPC: register_current_device(...)
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
    
    -- Create new device notification record
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (
        auth.uid(),
        'Yeni cihaz giriÅŸi',
        'Cihaz AdÄ±: ' || COALESCE(p_device_name, 'Bilinmiyor') || ', Platform: ' || COALESCE(p_platform, 'Bilinmiyor') || ', SÃ¼rÃ¼m: ' || COALESCE(p_app_version, 'Bilinmiyor') || ', Tarih: ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
    );
    
    RETURN json_build_object('success', true, 'device_id', v_new_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.register_current_device(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_current_device(text, text, text, text, text) TO authenticated;

-- 7. Secure RPC: list_current_user_devices()
CREATE OR REPLACE FUNCTION public.list_current_user_devices()
RETURNS TABLE (
    id UUID,
    device_name TEXT,
    platform TEXT,
    app_version TEXT,
    last_seen_at TIMESTAMPTZ,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT ud.id, ud.device_name, ud.platform, ud.app_version, ud.last_seen_at, ud.is_active
    FROM public.user_devices ud
    WHERE ud.user_id = auth.uid()
    ORDER BY ud.last_seen_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.list_current_user_devices() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_current_user_devices() TO authenticated;

-- 8. Secure RPC: revoke_current_user_device(device_id)
CREATE OR REPLACE FUNCTION public.revoke_current_user_device(p_device_id UUID)
RETURNS json AS $$
DECLARE
    v_exists boolean;
BEGIN
    -- Check if device belongs to current user
    SELECT EXISTS(
        SELECT 1 FROM public.user_devices 
        WHERE id = p_device_id AND user_id = auth.uid()
    ) INTO v_exists;
    
    IF NOT v_exists THEN
        RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED_OR_NOT_FOUND');
    END IF;
    
    -- Revoke device (mark is_active = false)
    UPDATE public.user_devices
    SET is_active = false,
        revoked_at = now()
    WHERE id = p_device_id;
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.revoke_current_user_device(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_current_user_device(UUID) TO authenticated;



-- ──────────────────────────────────────────────────────────
-- 20260712020000_multi_workspace_foundation.sql
-- ──────────────────────────────────────────────────────────
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
    VALUES (v_default_ws_id, 'KampÃ¼s KapÄ±nda', 'kampus-kapinda', 'tr', 'Europe/Istanbul', true)
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
        'Yeni cihaz giriÅŸi',
        'Cihaz AdÄ±: ' || COALESCE(p_device_name, 'Bilinmiyor') || ', Platform: ' || COALESCE(p_platform, 'Bilinmiyor') || ', SÃ¼rÃ¼m: ' || COALESCE(p_app_version, 'Bilinmiyor') || ', Tarih: ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
        v_ws_id
    );
    
    RETURN json_build_object('success', true, 'device_id', v_new_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;



-- ──────────────────────────────────────────────────────────
-- 20260712030000_multi_workspace_rls_and_apis.sql
-- ──────────────────────────────────────────────────────────
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
        'Ekibe katÄ±ldÄ±nÄ±z',
        'Ã‡alÄ±ÅŸma alanÄ±na baÅŸarÄ±yla katÄ±ldÄ±nÄ±z.',
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
        'Yeni cihaz giriÅŸi',
        'Cihaz AdÄ±: ' || COALESCE(p_device_name, 'Bilinmiyor') || ', Platform: ' || COALESCE(p_platform, 'Bilinmiyor') || ', SÃ¼rÃ¼m: ' || COALESCE(p_app_version, 'Bilinmiyor') || ', Tarih: ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
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
-- 9. VarsayÄ±lan KampÃ¼s KapÄ±nda Owner Bootstrap
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



-- ──────────────────────────────────────────────────────────
-- 20260712040000_decouple_signup_from_legacy_allowlist.sql
-- ──────────────────────────────────────────────────────────
-- Migration: Decouple user signup from legacy allowlist constraints
-- Target: Supabase DB Local Setup

-- Recreate trigger function with global account signup logic (no access_invitations lookup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role user_role;
    v_full_name TEXT;
BEGIN
    -- Derive display name
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    
    -- Assign default legacy roles for backward compatibility (does not impact workspace permission models)
    IF NEW.email = 'resultankilic.business@gmail.com' THEN
        v_role := 'admin'::user_role;
    ELSE
        v_role := 'intern'::user_role;
    END IF;

    -- Sync user profile record idempotently
    INSERT INTO public.profiles (id, email, role, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        v_role,
        v_full_name,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET 
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url;
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;



-- ──────────────────────────────────────────────────────────
-- 20260712050000_fix_owner_guard_and_workspace_creation.sql
-- ──────────────────────────────────────────────────────────
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



-- ──────────────────────────────────────────────────────────
-- 20260712060000_fix_invitation_task_assignment_resolution.sql
-- ──────────────────────────────────────────────────────────
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
        'Ekibe katÄ±ldÄ±nÄ±z',
        'Ã‡alÄ±ÅŸma alanÄ±na baÅŸarÄ±yla katÄ±ldÄ±nÄ±z.',
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



-- ──────────────────────────────────────────────────────────
-- 20260712070000_auto_invite_on_check_access.sql
-- ──────────────────────────────────────────────────────────
-- Auto-invite users on check access to allow normal sign-ups to bypass initial restrictions
CREATE OR REPLACE FUNCTION public.check_current_user_access()
RETURNS json AS $$
DECLARE
    v_email TEXT;
    v_invitation RECORD;
    v_profile RECORD;
BEGIN
    -- Clean the email address from auth context
    v_email := trim(lower(auth.jwt() ->> 'email'));
    
    -- Query the access allowlist
    SELECT * INTO v_invitation 
    FROM public.access_invitations 
    WHERE email = v_email;
    
    -- Check if invited, if not dynamically invite as intern (standard user role)
    IF NOT FOUND THEN
        INSERT INTO public.access_invitations (email, role, is_active)
        VALUES (v_email, 'intern'::user_role, true)
        RETURNING * INTO v_invitation;
    END IF;
    
    -- Check if inactive
    IF v_invitation.is_active = false THEN
        RETURN json_build_object(
            'allowed', false,
            'reason', 'inactive',
            'role', v_invitation.role,
            'university_id', v_invitation.university_id,
            'expires_at', v_invitation.expires_at
        );
    END IF;
    
    -- Check if expired
    IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < now() THEN
        RETURN json_build_object(
            'allowed', false,
            'reason', 'expired',
            'role', v_invitation.role,
            'university_id', v_invitation.university_id,
            'expires_at', v_invitation.expires_at
        );
    END IF;
    
    -- Check if profile exists
    SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
    IF NOT FOUND THEN
        RETURN json_build_object(
            'allowed', false,
            'reason', 'profile_missing',
            'role', v_invitation.role,
            'university_id', v_invitation.university_id,
            'expires_at', v_invitation.expires_at
        );
    END IF;
    
    -- Active and valid
    RETURN json_build_object(
        'allowed', true,
        'reason', 'active',
        'role', v_profile.role,
        'university_id', v_profile.university_id,
        'expires_at', v_invitation.expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;



-- ──────────────────────────────────────────────────────────
-- 20260712080000_fix_device_registration_uniqueness.sql
-- ──────────────────────────────────────────────────────────
-- Fix unique constraint conflict when multiple users sign in from the same device/emulator
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
    -- Check if device exists globally in user_devices (without filtering by user_id)
    SELECT * INTO v_device 
    FROM public.user_devices 
    WHERE device_identifier_hash = p_device_hash;
    
    IF FOUND THEN
        -- If device is registered to another user or is currently inactive, verify device limits for target user
        IF v_device.user_id != auth.uid() OR NOT v_device.is_active THEN
            SELECT count(*) INTO v_count 
            FROM public.user_devices 
            WHERE user_id = auth.uid() AND is_active = true;
            
            IF v_count >= 2 THEN
                RETURN json_build_object('success', false, 'error', 'DEVICE_LIMIT_REACHED');
            END IF;
        END IF;
        
        -- Update existing device and transfer ownership to the current user
        UPDATE public.user_devices 
        SET user_id = auth.uid(),
            is_active = true,
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
        'Yeni cihaz giriÅŸi',
        'Cihaz AdÄ±: ' || COALESCE(p_device_name, 'Bilinmiyor') || ', Platform: ' || COALESCE(p_platform, 'Bilinmiyor') || ', SÃ¼rÃ¼m: ' || COALESCE(p_app_version, 'Bilinmiyor') || ', Tarih: ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
        'global'::public.notification_scope,
        NULL
    );

    RETURN json_build_object('success', true, 'device_id', v_new_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;



-- ──────────────────────────────────────────────────────────
-- 20260723180000_task_templates_and_crm.sql
-- ──────────────────────────────────────────────────────────
-- Migration: Task Templates Automations and CRM Helpers
-- Date: 2026-07-23

-- Function to generate 24-step university opening tasks template
CREATE OR REPLACE FUNCTION generate_university_opening_tasks(
    p_university_id UUID,
    p_workspace_id UUID,
    p_created_by UUID DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_task_count INT := 0;
    v_creator UUID := p_created_by;
    v_titles TEXT[] := ARRAY[
        '1. KampÃ¼s AnalitiÄŸi ve Ã–ÄŸrenci YoÄŸunluk HaritasÄ± Ã‡Ä±karÄ±lmasÄ±',
        '2. KampÃ¼s Temsilcisi Ä°lanÄ±nÄ±n YayÄ±nlanmasÄ±',
        '3. Temsilci BaÅŸvurularÄ±nÄ±n DeÄŸerlendirilmesi',
        '4. Temsilci MÃ¼lakatlarÄ±nÄ±n GerÃ§ekleÅŸtirilmesi',
        '5. Temsilci Oryantasyon EÄŸitimi',
        '6. KampÃ¼s Ä°Ã§i Hedef Ä°ÅŸletme Listesinin OluÅŸturulmasÄ±',
        '7. Saha Ziyaret RotalarÄ±nÄ±n Belirlenmesi',
        '8. Ä°ÅŸletme Ä°lk Temas Ziyaretleri',
        '9. Ä°ÅŸletme Sunumu ve Teklif Ä°letimi',
        '10. SÃ¶zleÅŸme GÃ¶rÃ¼ÅŸmelerinin TamamlanmasÄ±',
        '11. Ä°ÅŸletme MenÃ¼ ve GÃ¶rsel Ä°Ã§eriklerinin AlÄ±nmasÄ±',
        '12. KampÃ¼s Hub Ä°ÅŸletme KaydÄ±nÄ±n AÃ§Ä±lmasÄ±',
        '13. POS / SipariÅŸ Entegrasyon Sistem Kurulumu',
        '14. Ä°ÅŸletme Personel EÄŸitimi',
        '15. WhatsApp Ä°letiÅŸim Grubu OluÅŸturulmasÄ±',
        '16. KampÃ¼s AÃ§Ä±lÄ±ÅŸ Pazarlama Stratejisi PlanlanmasÄ±',
        '17. Reklam GÃ¶rsel ve AfiÅŸ BasÄ±mlarÄ±nÄ±n TamamlanmasÄ±',
        '18. KampÃ¼s Stant Yerlerinin Belirlenmesi ve Ä°zin AlÄ±nmasÄ±',
        '19. Stant ve Promosyon Malzemelerinin Sevk Edilmesi',
        '20. KampÃ¼s Sosyal Medya KanalÄ±nÄ±n AÃ§Ä±lmasÄ±',
        '21. AÃ§Ä±lÄ±ÅŸ Lansman KampanyasÄ±nÄ±n BaÅŸlatÄ±lmasÄ±',
        '22. Ä°lk SipariÅŸ Testlerinin YapÄ±lmasÄ± ve DoÄŸrulanmasÄ±',
        '23. CanlÄ±ya GeÃ§iÅŸ Duyurusu',
        '24. HaftalÄ±k Operasyonel DeÄŸerlendirme ToplantÄ±sÄ±'
    ];
    v_title TEXT;
    v_idx INT := 1;
BEGIN
    IF p_university_id IS NULL OR p_workspace_id IS NULL THEN
        RAISE EXCEPTION 'university_id and workspace_id are required';
    END IF;

    IF v_creator IS NULL THEN
        v_creator := auth.uid();
    END IF;

    FOREACH v_title IN ARRAY v_titles LOOP
        INSERT INTO tasks (
            title,
            description,
            university_id,
            workspace_id,
            priority,
            status,
            effort_score,
            created_by,
            start_date,
            due_date
        ) VALUES (
            v_title,
            'Otomatik oluÅŸturulan Ã¼niversite aÃ§Ä±lÄ±ÅŸ ÅŸablon gÃ¶revi (AÅŸama ' || v_idx || ')',
            p_university_id,
            p_workspace_id,
            CASE WHEN v_idx IN (1, 10, 13, 22, 23) THEN 'critical'::task_priority ELSE 'normal'::task_priority END,
            'planned'::task_status,
            3,
            v_creator,
            CURRENT_DATE + (v_idx || ' days')::INTERVAL,
            CURRENT_DATE + ((v_idx + 2) || ' days')::INTERVAL
        );
        v_task_count := v_task_count + 1;
        v_idx := v_idx + 1;
    END LOOP;

    RETURN v_task_count;
END;
$$;

-- Trigger Function on Universities Insertion
CREATE OR REPLACE FUNCTION trigger_generate_university_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ws_id UUID := NEW.workspace_id;
BEGIN
    IF v_ws_id IS NULL THEN
        SELECT id INTO v_ws_id FROM workspaces LIMIT 1;
    END IF;

    IF v_ws_id IS NOT NULL THEN
        PERFORM generate_university_opening_tasks(NEW.id, v_ws_id, NULL);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_generate_university_tasks ON universities;
CREATE TRIGGER trg_auto_generate_university_tasks
    AFTER INSERT ON universities
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_university_tasks();

-- Grant permissions to authenticated role
GRANT EXECUTE ON FUNCTION generate_university_opening_tasks(UUID, UUID, UUID) TO authenticated;



-- ──────────────────────────────────────────────────────────
-- 20260723200000_performance_optimizations_and_schema_cleanup.sql
-- ──────────────────────────────────────────────────────────
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



-- ──────────────────────────────────────────────────────────
-- 20260723210000_fix_expired_access_invitations.sql
-- ──────────────────────────────────────────────────────────
-- Migration: Fix Expired Access Invitations & Prolong Access
-- Date: 2026-07-23

-- 1. Reset any expired dates in access_invitations table so users are not blocked
UPDATE public.access_invitations
SET expires_at = NULL, is_active = true
WHERE expires_at IS NOT NULL AND expires_at < now();

-- 2. Update check_current_user_access RPC to set NULL expires_at on auto-invites
CREATE OR REPLACE FUNCTION public.check_current_user_access()
RETURNS json AS $$
DECLARE
    v_email TEXT;
    v_invitation RECORD;
    v_profile RECORD;
BEGIN
    v_email := trim(lower(auth.jwt() ->> 'email'));
    
    SELECT * INTO v_invitation 
    FROM public.access_invitations 
    WHERE email = v_email;
    
    IF NOT FOUND THEN
        INSERT INTO public.access_invitations (email, role, is_active, expires_at)
        VALUES (v_email, 'intern'::user_role, true, NULL)
        RETURNING * INTO v_invitation;
    END IF;
    
    IF v_invitation.is_active = false THEN
        RETURN json_build_object(
            'allowed', false,
            'reason', 'inactive',
            'role', v_invitation.role
        );
    END IF;
    
    IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < now() THEN
        RETURN json_build_object(
            'allowed', false,
            'reason', 'expired',
            'role', v_invitation.role
        );
    END IF;
    
    SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
    IF NOT FOUND THEN
        RETURN json_build_object(
            'allowed', false,
            'reason', 'profile_missing',
            'role', v_invitation.role
        );
    END IF;
    
    RETURN json_build_object(
        'allowed', true,
        'reason', 'active',
        'role', v_profile.role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;



-- ──────────────────────────────────────────────────────────
-- 20260723220000_make_business_university_id_optional.sql
-- ──────────────────────────────────────────────────────────
-- Migration: Make university_id optional on businesses table for flexible CRM onboarding
ALTER TABLE public.businesses ALTER COLUMN university_id DROP NOT NULL;


