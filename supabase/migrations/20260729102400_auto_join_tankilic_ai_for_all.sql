-- Migration: Auto-join 'tankilic.ai for all' workspace
-- Target: Supabase DB Local Setup

-- Recreate trigger function with auto-join logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role user_role;
    v_full_name TEXT;
    v_target_ws_id UUID;
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
        
    -- Auto-join "tankilic.ai for all" workspace if it exists
    SELECT id INTO v_target_ws_id FROM public.workspaces WHERE name = 'tankilic.ai for all' LIMIT 1;
    
    IF v_target_ws_id IS NOT NULL THEN
        INSERT INTO public.workspace_members (workspace_id, user_id, permission_role)
        VALUES (v_target_ws_id, NEW.id, 'member')
        ON CONFLICT (workspace_id, user_id) DO NOTHING;
    END IF;
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;
