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
