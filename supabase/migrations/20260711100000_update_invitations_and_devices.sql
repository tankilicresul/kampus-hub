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
        'Yeni cihaz girişi',
        'Cihaz Adı: ' || COALESCE(p_device_name, 'Bilinmiyor') || ', Platform: ' || COALESCE(p_platform, 'Bilinmiyor') || ', Sürüm: ' || COALESCE(p_app_version, 'Bilinmiyor') || ', Tarih: ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
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
