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
