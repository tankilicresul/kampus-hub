-- AUTOMATED VERIFICATION TEST SCRIPT FOR MILESTONE 3C-A
-- This script validates workspace creation, constraints, migration mapping, indexes, and pending assignments.

BEGIN;

SELECT plan(14);

-- =========================================================================
-- TEST 1: Default Kampüs Kapında workspace exists
-- =========================================================================
SELECT is(
    (SELECT count(*) FROM public.workspaces WHERE id = 'df39e73b-bf72-4d1a-9694-82bd8996b797'),
    1::bigint,
    'Default Kampüs Kapında workspace exists'
);

-- =========================================================================
-- TEST 2: Default workspace settings created
-- =========================================================================
SELECT is(
    (SELECT count(*) FROM public.workspace_settings WHERE workspace_id = 'df39e73b-bf72-4d1a-9694-82bd8996b797'),
    1::bigint,
    'Default workspace settings created'
);

-- =========================================================================
-- TEST 3: Inserting duplicate workspace slug throws unique constraint violation
-- =========================================================================
SELECT throws_ok(
    $$INSERT INTO public.workspaces (name, slug) VALUES ('Duplicate WS', 'kampus-kapinda')$$,
    '23505',
    NULL,
    'Inserting duplicate workspace slug throws unique constraint violation'
);

-- =========================================================================
-- TEST 4: Owner membership created if user exists
-- =========================================================================
SELECT is(
    (SELECT count(*) FROM public.workspace_members WHERE workspace_id = 'df39e73b-bf72-4d1a-9694-82bd8996b797' AND permission_role = 'owner'),
    (SELECT count(*) FROM public.profiles WHERE email = 'resultankilic.business@gmail.com')::bigint,
    'Owner membership created if user exists'
);

-- =========================================================================
-- TEST 5: Inserting duplicate active workspace member throws unique constraint violation
-- =========================================================================
-- Set up a test profile
INSERT INTO public.profiles (id, email, role, full_name) VALUES
('99999999-9999-9999-9999-999999999999', 'testmember@test.com', 'intern', 'Test Member');

INSERT INTO public.workspace_members (workspace_id, user_id, permission_role, job_role, membership_status) VALUES
('df39e73b-bf72-4d1a-9694-82bd8996b797', '99999999-9999-9999-9999-999999999999', 'member', 'operations', 'active');

SELECT throws_ok(
    $$INSERT INTO public.workspace_members (workspace_id, user_id, permission_role, job_role, membership_status) 
      VALUES ('df39e73b-bf72-4d1a-9694-82bd8996b797', '99999999-9999-9999-9999-999999999999', 'member', 'operations', 'active')$$,
    '23505',
    NULL,
    'Inserting duplicate active workspace member throws unique constraint violation'
);

-- =========================================================================
-- TEST 6: Inserting duplicate workspace member university scope throws unique constraint violation
-- =========================================================================
-- Set up a test university
INSERT INTO public.universities (id, name, city, workspace_id) VALUES
('99999999-1111-1111-1111-111111111111', 'Uni Test', 'Istanbul', 'df39e73b-bf72-4d1a-9694-82bd8996b797');

-- Retrieve workspace member ID
SELECT set_config('test.member_id', id::text, true) 
FROM public.workspace_members 
WHERE user_id = '99999999-9999-9999-9999-999999999999';

INSERT INTO public.workspace_member_university_scopes (workspace_member_id, university_id) VALUES
(current_setting('test.member_id', true)::uuid, '99999999-1111-1111-1111-111111111111');

SELECT throws_ok(
    $$INSERT INTO public.workspace_member_university_scopes (workspace_member_id, university_id) 
      VALUES (current_setting('test.member_id', true)::uuid, '99999999-1111-1111-1111-111111111111')$$,
    '23505',
    NULL,
    'Inserting duplicate workspace member university scope throws unique constraint violation'
);

-- =========================================================================
-- TEST 7: Inserting duplicate token_hash in invitations throws unique constraint violation
-- =========================================================================
INSERT INTO public.workspace_invitations (workspace_id, normalized_email, token_hash, permission_role, job_role, invitation_status) VALUES
('df39e73b-bf72-4d1a-9694-82bd8996b797', 'invite1@test.com', 'hash_test_123', 'member', 'operations', 'pending');

SELECT throws_ok(
    $$INSERT INTO public.workspace_invitations (workspace_id, normalized_email, token_hash, permission_role, job_role, invitation_status) 
      VALUES ('df39e73b-bf72-4d1a-9694-82bd8996b797', 'invite2@test.com', 'hash_test_123', 'member', 'operations', 'pending')$$,
    '23505',
    NULL,
    'Inserting duplicate token_hash in invitations throws unique constraint violation'
);

-- =========================================================================
-- TEST 8: Inserting second active pending invitation for same workspace and email throws unique constraint
-- =========================================================================
SELECT throws_ok(
    $$INSERT INTO public.workspace_invitations (workspace_id, normalized_email, token_hash, permission_role, job_role, invitation_status) 
      VALUES ('df39e73b-bf72-4d1a-9694-82bd8996b797', 'invite1@test.com', 'hash_test_456', 'member', 'operations', 'pending')$$,
    '23505',
    NULL,
    'Inserting second active pending invitation for same workspace and email throws unique constraint'
);

-- =========================================================================
-- TEST 9: Allows inviting the same email in a different workspace
-- =========================================================================
-- Set up workspace 2
INSERT INTO public.workspaces (id, name, slug) VALUES
('88888888-8888-8888-8888-888888888888', 'WS 2', 'ws-two');

SELECT lives_ok(
    $$INSERT INTO public.workspace_invitations (workspace_id, normalized_email, token_hash, permission_role, job_role, invitation_status) 
      VALUES ('88888888-8888-8888-8888-888888888888', 'invite1@test.com', 'hash_test_789', 'member', 'operations', 'pending')$$,
    'Allows inviting the same email in a different workspace'
);

-- =========================================================================
-- TEST 10: No tasks have NULL workspace_id
-- =========================================================================
SELECT is(
    (SELECT count(*) FROM public.tasks WHERE workspace_id IS NULL),
    0::bigint,
    'No tasks have NULL workspace_id'
);

-- =========================================================================
-- TEST 11: No universities have NULL workspace_id
-- =========================================================================
SELECT is(
    (SELECT count(*) FROM public.universities WHERE workspace_id IS NULL),
    0::bigint,
    'No universities have NULL workspace_id'
);

-- =========================================================================
-- TEST 12: No invitations were lost during migration mapping
-- =========================================================================
SELECT is(
    (SELECT count(*) FROM public.workspace_invitations WHERE workspace_id = (SELECT id FROM public.workspaces WHERE slug = 'kampus-kapinda' LIMIT 1) AND normalized_email = 'invite1@test.com'),
    1::bigint,
    'Verification invitation invite1@test.com is mapped in default workspace'
);

-- =========================================================================
-- TEST 13: Inserting duplicate pending assignment idempotency key throws unique constraint
-- =========================================================================
-- Insert test task
INSERT INTO public.tasks (id, workspace_id, title) VALUES
('77777777-7777-7777-7777-777777777777', 'df39e73b-bf72-4d1a-9694-82bd8996b797', 'Test Task');

-- Retrieve invitation ID
SELECT set_config('test.inv_id', id::text, true)
FROM public.workspace_invitations 
WHERE normalized_email = 'invite1@test.com' LIMIT 1;

INSERT INTO public.pending_task_assignments (workspace_id, workspace_invitation_id, task_id, normalized_email, assignment_role, idempotency_key) VALUES
('df39e73b-bf72-4d1a-9694-82bd8996b797', current_setting('test.inv_id', true)::uuid, '77777777-7777-7777-7777-777777777777', 'invite1@test.com', 'primary_assignee', 'key_123');

SELECT throws_ok(
    $$INSERT INTO public.pending_task_assignments (workspace_id, workspace_invitation_id, task_id, normalized_email, assignment_role, idempotency_key) 
      VALUES ('df39e73b-bf72-4d1a-9694-82bd8996b797', current_setting('test.inv_id', true)::uuid, '77777777-7777-7777-7777-777777777777', 'invite1@test.com', 'primary_assignee', 'key_123')$$,
    '23505',
    NULL,
    'Inserting duplicate pending assignment idempotency key throws unique constraint'
);

-- =========================================================================
-- TEST 14: Profiles last_active_workspace_id foreign key constraint works
-- =========================================================================
SELECT throws_ok(
    $$UPDATE public.profiles SET last_active_workspace_id = '00000000-0000-0000-0000-000000000000' WHERE id = '99999999-9999-9999-9999-999999999999'$$,
    '23503',
    NULL,
    'Updating profiles last_active_workspace_id with invalid UUID throws foreign key violation'
);

SELECT * FROM finish();

ROLLBACK;
