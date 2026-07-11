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
