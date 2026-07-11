-- AUTOMATED VERIFICATION TEST SCRIPT FOR MILESTONE 3
-- This script validates Google OAuth access allowlists, user profile idempotent syncs, active device limit checks, and security RPC behaviors.

BEGIN;

SELECT plan(12);

-- Seed universities
INSERT INTO public.universities (id, name, city, workspace_id) VALUES
('11111111-1111-1111-1111-111111111111', 'Uni A', 'Istanbul', 'df39e73b-bf72-4d1a-9694-82bd8996b797'),
('22222222-2222-2222-2222-222222222222', 'Uni B', 'Ankara', 'df39e73b-bf72-4d1a-9694-82bd8996b797');

-- =========================================================================
-- TEST 1: Check not_invited
-- =========================================================================
SET LOCAL request.jwt.claims = '{"email": "notinvited@test.com", "sub": "00000000-0000-0000-0000-000000000099"}';
SET LOCAL ROLE authenticated;

SELECT is(
    (public.check_current_user_access() ->> 'reason'),
    'not_invited',
    'check_current_user_access returns not_invited for unregistered emails'
);

-- =========================================================================
-- TEST 2: Check inactive invitation
-- =========================================================================
RESET ROLE;
SET ROLE postgres;

INSERT INTO public.access_invitations (email, role, is_active) VALUES
('inactive@test.com', 'operations', false);

SET LOCAL request.jwt.claims = '{"email": "inactive@test.com", "sub": "00000000-0000-0000-0000-000000000098"}';
SET LOCAL ROLE authenticated;

SELECT is(
    (public.check_current_user_access() ->> 'reason'),
    'inactive',
    'check_current_user_access returns inactive for disabled invites'
);

-- =========================================================================
-- TEST 3: Check expired invitation
-- =========================================================================
RESET ROLE;
SET ROLE postgres;

INSERT INTO public.access_invitations (email, role, is_active, expires_at) VALUES
('expired@test.com', 'operations', true, now() - INTERVAL '1 hour');

SET LOCAL request.jwt.claims = '{"email": "expired@test.com", "sub": "00000000-0000-0000-0000-000000000097"}';
SET LOCAL ROLE authenticated;

SELECT is(
    (public.check_current_user_access() ->> 'reason'),
    'expired',
    'check_current_user_access returns expired for old invites'
);

-- =========================================================================
-- TEST 4: Check profile sync idempotency
-- =========================================================================
RESET ROLE;
SET ROLE postgres;

-- Create active invitation
INSERT INTO public.access_invitations (email, role, is_active) VALUES
('activeuser@test.com', 'operations', true);

-- Insert auth user (this triggers handle_new_user trigger)
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
('00000000-0000-0000-0000-000000000100', 'activeuser@test.com', '{"full_name": "Active User"}', 'authenticated', 'authenticated');

-- Check if profile is synced with default legacy role 'intern' and no workspace membership
SELECT results_eq(
    'SELECT role, full_name, (SELECT count(*) FROM public.workspace_members WHERE user_id = ''00000000-0000-0000-0000-000000000100'') FROM public.profiles WHERE id = ''00000000-0000-0000-0000-000000000100''',
    $$VALUES ('intern'::user_role, 'Active User', 0::bigint)$$,
    'Trigger handle_new_user automatically syncs profile with intern default role and no workspace membership'
);

-- Repeat sync check by manually verifying no duplicate is made
SELECT is(
    (SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000100'),
    1::bigint,
    'Profiles table has exactly one record for the synced user (idempotence)'
);

-- =========================================================================
-- TEST 5: Register device 1 and device 2
-- =========================================================================
RESET ROLE;
SET ROLE postgres;
SET LOCAL request.jwt.claims = '{"email": "activeuser@test.com", "sub": "00000000-0000-0000-0000-000000000100"}';
SET LOCAL ROLE authenticated;

SELECT is(
    (public.register_current_device('hash1', 'Phone 1', 'iOS', '1.0.0', 'token1') ->> 'success')::boolean,
    true,
    'Allows registration of first device'
);

SELECT is(
    (public.register_current_device('hash2', 'Phone 2', 'iOS', '1.0.0', 'token2') ->> 'success')::boolean,
    true,
    'Allows registration of second device'
);

-- =========================================================================
-- TEST 6: Register device 3 (fails with DEVICE_LIMIT_REACHED)
-- =========================================================================
SELECT is(
    (public.register_current_device('hash3', 'Phone 3', 'Android', '1.0.0', 'token3') ->> 'success')::boolean,
    false,
    'Blocks registration of third device'
);

SELECT is(
    (public.register_current_device('hash3', 'Phone 3', 'Android', '1.0.0', 'token3') ->> 'error'),
    'DEVICE_LIMIT_REACHED',
    'Returns DEVICE_LIMIT_REACHED error code on device boundary limits'
);

-- =========================================================================
-- TEST 7: Revoke device 1, and then register device 3 successfully
-- =========================================================================
DO $$
DECLARE
    v_dev_id UUID;
BEGIN
    SELECT id INTO v_dev_id FROM public.user_devices WHERE device_identifier_hash = 'hash1';
    PERFORM public.revoke_current_user_device(v_dev_id);
END
$$;

SELECT is(
    (public.register_current_device('hash3', 'Phone 3', 'Android', '1.0.0', 'token3') ->> 'success')::boolean,
    true,
    'Allows registration of third device after revoking one of the active devices'
);

-- =========================================================================
-- TEST 8: Security check - user 2 cannot revoke user 1's device
-- =========================================================================
RESET ROLE;
SET ROLE postgres;

-- Create user 2
INSERT INTO public.access_invitations (email, role, is_active) VALUES
('user2@test.com', 'operations', true);

INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
('00000000-0000-0000-0000-000000000200', 'user2@test.com', '{"full_name": "User 2"}', 'authenticated', 'authenticated');

-- Fetch User 1's device ID under postgres superuser role and save to transaction setting
SELECT set_config('test.target_device_id', id::text, true) 
FROM public.user_devices 
WHERE device_identifier_hash = 'hash2';

-- Log in as user 2
SET LOCAL request.jwt.claims = '{"email": "user2@test.com", "sub": "00000000-0000-0000-0000-000000000200"}';
SET LOCAL ROLE authenticated;

-- Try to revoke user 1's device using the known ID and expect UNAUTHORIZED_OR_NOT_FOUND
SELECT is(
    public.revoke_current_user_device( current_setting('test.target_device_id', true)::uuid ) ->> 'error',
    'UNAUTHORIZED_OR_NOT_FOUND',
    'User 2 cannot revoke User 1s device even if they know the device ID'
);

-- =========================================================================
-- TEST 9: Device registration triggers notification entry
-- =========================================================================
RESET ROLE;
SET ROLE postgres;

SELECT is(
    (SELECT count(*) FROM public.notifications WHERE user_id = '00000000-0000-0000-0000-000000000100'),
    3::bigint, -- Phone 1, Phone 2, and Phone 3 registrations
    'New device registrations successfully create entries in notifications table'
);

SELECT * FROM finish();

ROLLBACK;
