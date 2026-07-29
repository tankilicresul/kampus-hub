-- Migration: Auto-join 'tankilic.ai for all' workspace
-- Target: Supabase DB Local Setup

-- 1. Add trigger function
CREATE OR REPLACE FUNCTION public.auto_add_profile_to_tankilic_workspace()
RETURNS TRIGGER AS $$
DECLARE
    v_target_ws_id UUID;
BEGIN
    SELECT id INTO v_target_ws_id FROM public.workspaces WHERE name = 'tankilic.ai for all' LIMIT 1;
    
    IF v_target_ws_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.workspace_members 
        WHERE workspace_id = v_target_ws_id 
          AND user_id = NEW.id 
          AND deleted_at IS NULL
    ) THEN
        INSERT INTO public.workspace_members (workspace_id, user_id, permission_role, membership_status)
        VALUES (v_target_ws_id, NEW.id, 'member', 'active');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add trigger
CREATE OR REPLACE TRIGGER trg_auto_join_tankilic_workspace
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_profile_to_tankilic_workspace();

-- 3. Add existing users
DO $$
DECLARE
    v_target_ws_id UUID;
BEGIN
    SELECT id INTO v_target_ws_id FROM public.workspaces WHERE name = 'tankilic.ai for all' LIMIT 1;
    
    IF v_target_ws_id IS NOT NULL THEN
        INSERT INTO public.workspace_members (workspace_id, user_id, permission_role, membership_status)
        SELECT v_target_ws_id, id, 'member', 'active'
        FROM public.profiles
        WHERE id NOT IN (
            SELECT user_id 
            FROM public.workspace_members 
            WHERE workspace_id = v_target_ws_id 
              AND deleted_at IS NULL
        );
    END IF;
END $$;
