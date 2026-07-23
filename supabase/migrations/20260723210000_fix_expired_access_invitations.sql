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
