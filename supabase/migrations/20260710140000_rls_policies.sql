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
