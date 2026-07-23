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
        'Yeni cihaz girişi',
        'Cihaz Adı: ' || COALESCE(p_device_name, 'Bilinmiyor') || ', Platform: ' || COALESCE(p_platform, 'Bilinmiyor') || ', Sürüm: ' || COALESCE(p_app_version, 'Bilinmiyor') || ', Tarih: ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
        'global'::public.notification_scope,
        NULL
    );

    RETURN json_build_object('success', true, 'device_id', v_new_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
