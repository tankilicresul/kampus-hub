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
