-- MILESTONE 3C-B VERIFICATION TEST SUITE
-- This script validates Tenant RLS, Workspace RPCs and Ownership Security constraints using pgTAP.

BEGIN;

-- Plan the number of tests
SELECT plan(25);

-- =========================================================================
-- STEP 1: Seed Mock Data under postgres role
-- =========================================================================
SET ROLE postgres;

-- 1. Mock auth users
INSERT INTO auth.users (id, email) VALUES
('a0000000-0000-0000-0000-000000000001', 'owner_a@test.com'),
('a0000000-0000-0000-0000-000000000002', 'admin_a@test.com'),
('a0000000-0000-0000-0000-000000000003', 'member_a@test.com'),
('a0000000-0000-0000-0000-000000000004', 'rep_a@test.com'),
('b0000000-0000-0000-0000-000000000001', 'owner_b@test.com'),
('b0000000-0000-0000-0000-000000000002', 'member_b@test.com'),
('c0000000-0000-0000-0000-000000000001', 'outsider@test.com'),
('c0000000-0000-0000-0000-000000000002', 'invitee@test.com');

-- 2. Mock profiles details (Updated trigger-created profiles)
UPDATE public.profiles SET full_name = 'Owner A' WHERE id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET full_name = 'Admin A' WHERE id = 'a0000000-0000-0000-0000-000000000002';
UPDATE public.profiles SET full_name = 'Member A' WHERE id = 'a0000000-0000-0000-0000-000000000003';
UPDATE public.profiles SET full_name = 'Rep A' WHERE id = 'a0000000-0000-0000-0000-000000000004';
UPDATE public.profiles SET full_name = 'Owner B' WHERE id = 'b0000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET full_name = 'Member B' WHERE id = 'b0000000-0000-0000-0000-000000000002';
UPDATE public.profiles SET full_name = 'Outsider' WHERE id = 'c0000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET full_name = 'Invitee' WHERE id = 'c0000000-0000-0000-0000-000000000002';


-- 3. Mock workspaces
INSERT INTO public.workspaces (id, name, slug) VALUES
('a0000000-0000-0000-0000-000000000000', 'Workspace A', 'workspace-a'),
('b0000000-0000-0000-0000-000000000000', 'Workspace B', 'workspace-b');

-- 4. Mock workspace settings
INSERT INTO public.workspace_settings (workspace_id) VALUES
('a0000000-0000-0000-0000-000000000000'),
('b0000000-0000-0000-0000-000000000000');

-- 5. Mock workspace members
INSERT INTO public.workspace_members (id, workspace_id, user_id, permission_role, job_role, custom_job_role, membership_status) VALUES
('a0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'owner', 'custom', 'Kurucu', 'active'),
('a0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'admin', 'operations', null, 'active'),
('a0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'member', 'marketing', null, 'active'),
('a0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000004', 'member', 'university_representative', null, 'active'),
('b0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'owner', 'custom', 'Kurucu', 'active'),
('b0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000002', 'member', 'operations', null, 'active');

-- Update profiles last active workspace
UPDATE public.profiles SET last_active_workspace_id = 'a0000000-0000-0000-0000-000000000000' WHERE id IN ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004');
UPDATE public.profiles SET last_active_workspace_id = 'b0000000-0000-0000-0000-000000000000' WHERE id IN ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002');

-- 6. Mock universities in Workspace A
INSERT INTO public.universities (id, name, city, workspace_id) VALUES
('11111111-1111-1111-1111-111111111111', 'Uni A1', 'Istanbul', 'a0000000-0000-0000-0000-000000000000'),
('22222222-2222-2222-2222-222222222222', 'Uni A2', 'Istanbul', 'a0000000-0000-0000-0000-000000000000');

-- Mock universities in Workspace B
INSERT INTO public.universities (id, name, city, workspace_id) VALUES
('33333333-3333-3333-3333-333333333333', 'Uni B1', 'Istanbul', 'b0000000-0000-0000-0000-000000000000');

-- Scope rep_a to Uni A1 (but not A2)
INSERT INTO public.workspace_member_university_scopes (workspace_member_id, university_id, created_by) VALUES
('a0000000-0000-0000-0000-000000000014', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001');

-- 7. Mock tasks
INSERT INTO public.tasks (id, title, status, university_id, workspace_id) VALUES
('99999999-1111-1111-1111-111111111111', 'Task in Uni A1', 'todo', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000000'),
('99999999-2222-2222-2222-222222222222', 'Task in Uni A2', 'todo', '22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000000'),
('99999999-3333-3333-3333-333333333333', 'Task in Workspace B', 'todo', '33333333-3333-3333-3333-333333333333', 'b0000000-0000-0000-0000-000000000000');

-- 8. Mock contracts in Workspace A
INSERT INTO public.businesses (id, name, stage, university_id, workspace_id) VALUES
('55555555-5555-5555-5555-555555555555', 'Business A1', 'discovered', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000000');

INSERT INTO public.contracts (id, business_id, document_url, workspace_id) VALUES
('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', 'link-contract-a1', 'a0000000-0000-0000-0000-000000000000');

-- =========================================================================
-- TEST SET 1: Tenant RLS Isolation Checks
-- =========================================================================

-- Test 1: Workspace A member can read Workspace A university
SET LOCAL request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000003", "email": "member_a@test.com"}';
SET LOCAL ROLE authenticated;
SELECT results_eq(
    'SELECT name FROM public.universities ORDER BY name',
    ARRAY['Uni A1', 'Uni A2'],
    'Workspace A member should see Workspace A universities'
);

-- Test 2: Workspace B member cannot read Workspace A university (isolated)
SET ROLE postgres;
SET LOCAL request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002", "email": "member_b@test.com"}';
SET LOCAL ROLE authenticated;
SELECT results_eq(
    'SELECT name FROM public.universities ORDER BY name',
    ARRAY['Uni B1'],
    'Workspace B member should only see Workspace B universities'
);

-- Test 3: Workspace B member cannot select Workspace A tasks
SELECT is_empty(
    $$SELECT id FROM public.tasks WHERE workspace_id = 'a0000000-0000-0000-0000-000000000000'$$,
    'Workspace B member should not see Workspace A tasks'
);

-- =========================================================================
-- TEST SET 2: Representative University Scopes Check
-- =========================================================================

-- Test 4: Rep A can only see Uni A1 because their scope is restricted
SET ROLE postgres;
SET LOCAL request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000004", "email": "rep_a@test.com"}';
SET LOCAL ROLE authenticated;
SELECT results_eq(
    'SELECT name FROM public.universities ORDER BY name',
    ARRAY['Uni A1'],
    'University representative should see only assigned scope university'
);

-- Test 5: Rep A cannot see tasks belonging to Uni A2 (where they have no scope)
SELECT results_eq(
    'SELECT title FROM public.tasks ORDER BY title',
    ARRAY['Task in Uni A1'],
    'University representative should only see tasks under their scoped university'
);

-- =========================================================================
-- TEST SET 3: Contracts Security Check
-- =========================================================================

-- Test 6: Member A cannot see contracts
SET ROLE postgres;
SET LOCAL request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000003", "email": "member_a@test.com"}';
SET LOCAL ROLE authenticated;
SELECT is_empty(
    'SELECT document_url FROM public.contracts',
    'Standard member role should not be allowed to see contracts'
);

-- Test 7: Owner A can see contracts
SET ROLE postgres;
SET LOCAL request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001", "email": "owner_a@test.com"}';
SET LOCAL ROLE authenticated;
SELECT results_eq(
    'SELECT document_url FROM public.contracts',
    ARRAY['link-contract-a1'],
    'Owner should have access to read contracts'
);

-- =========================================================================
-- TEST SET 4: Owner Security Trigger Checks
-- =========================================================================
SET ROLE postgres;

-- Test 8: Trying to delete the last active owner throws trigger exception
SELECT throws_ok(
    $$DELETE FROM public.workspace_members WHERE user_id = 'a0000000-0000-0000-0000-000000000001' AND workspace_id = 'a0000000-0000-0000-0000-000000000000'$$,
    'P0001',
    'Access denied: Workspace must have at least one active Owner. Transfer ownership before leaving or changing roles.',
    'Deleting last active owner must be blocked'
);

-- Test 9: Trying to demote the last active owner role throws trigger exception
SELECT throws_ok(
    $$UPDATE public.workspace_members SET permission_role = 'admin' WHERE user_id = 'a0000000-0000-0000-0000-000000000001' AND workspace_id = 'a0000000-0000-0000-0000-000000000000'$$,
    'P0001',
    'Access denied: Workspace must have at least one active Owner. Transfer ownership before leaving or changing roles.',
    'Demoting last active owner must be blocked'
);

-- =========================================================================
-- TEST SET 5: Workspace RPC API Functionality Checks
-- =========================================================================

-- Test 10: Create Workspace RPC
SET LOCAL request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000001", "email": "outsider@test.com"}';
SET LOCAL ROLE authenticated;
SELECT is(
    (SELECT (public.create_workspace_with_owner('New Workspace', 'new-workspace-slug', 'education') ->> 'success')::boolean),
    true,
    'create_workspace_with_owner should create workspace and return success'
);

-- Test 11: Created workspace creator is registered as Owner
SELECT results_eq(
    $$SELECT permission_role FROM public.workspace_members WHERE workspace_id = (SELECT id FROM public.workspaces WHERE slug = 'new-workspace-slug') AND user_id = 'c0000000-0000-0000-0000-000000000001'$$,
    ARRAY['owner'::public.workspace_permission_role],
    'Workspace creator should be registered as owner member'
);

-- Test 12: Duplicate slug creation fails
SELECT throws_ok(
    $$SELECT public.create_workspace_with_owner('Another New WS', 'new-workspace-slug', 'education')$$,
    '23505',
    'Slug already exists',
    'Creating workspace with duplicate slug must fail'
);

-- Test 13: List workspaces RPC
SELECT results_eq(
    'SELECT name FROM public.list_current_user_workspaces()',
    ARRAY['New Workspace'],
    'list_current_user_workspaces returns user workspaces'
);

-- =========================================================================
-- TEST SET 6: Active Workspace Switch Check
-- =========================================================================

-- Test 14: User cannot set outsider workspace as active
SELECT throws_ok(
    $$SELECT public.set_current_user_active_workspace('a0000000-0000-0000-0000-000000000000')$$,
    '42501',
    'Access denied: You are not an active member of this workspace',
    'Outsider active workspace switch must fail'
);

-- Test 15: User can set member workspace as active
SET ROLE postgres;
-- Add user c0000000-0000-0000-0000-000000000001 to Workspace A
INSERT INTO public.workspace_members (workspace_id, user_id, permission_role, job_role, custom_job_role, membership_status) VALUES
('a0000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'member', 'operations', null, 'active');

SET LOCAL request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000001", "email": "outsider@test.com"}';
SET LOCAL ROLE authenticated;
SELECT is(
    (SELECT (public.set_current_user_active_workspace('a0000000-0000-0000-0000-000000000000') ->> 'success')::boolean),
    true,
    'set_current_user_active_workspace switches active workspace for members'
);

-- =========================================================================
-- TEST SET 7: Invitations Management Checks
-- =========================================================================
SET ROLE postgres;

-- Mock invitee invitation to Workspace B
INSERT INTO public.workspace_invitations (id, workspace_id, normalized_email, token_hash, permission_role, job_role, custom_job_role, invitation_status) VALUES
('ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee', 'b0000000-0000-0000-0000-000000000000', 'invitee@test.com', 'test_token_hash_value_123', 'member', 'operations', null, 'pending');

-- Seed a task with pending assignment mapping
INSERT INTO public.pending_task_assignments (workspace_id, workspace_invitation_id, task_id, normalized_email, assignment_role, idempotency_key) VALUES
('b0000000-0000-0000-0000-000000000000', 'ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee', '99999999-3333-3333-3333-333333333333', 'invitee@test.com', 'primary_assignee', 'idem_key_invitee_task');

-- Test 16: List pending invitations for matching email
SET LOCAL request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000002", "email": "invitee@test.com"}';
SET LOCAL ROLE authenticated;
SELECT results_eq(
    'SELECT workspace_name FROM public.list_current_user_pending_workspace_invitations()',
    ARRAY['Workspace B'],
    'Pending invitations list matching user email'
);

-- Test 17: Accept invitation maps memberships and tasks
SELECT is(
    (SELECT (public.accept_current_user_workspace_invitation('ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee') ->> 'success')::boolean),
    true,
    'accept_current_user_workspace_invitation should accept pending invitation'
);

-- Test 18: Member membership is active after accept
SET ROLE postgres;
SELECT results_eq(
    $$SELECT membership_status FROM public.workspace_members WHERE workspace_id = 'b0000000-0000-0000-0000-000000000000' AND user_id = 'c0000000-0000-0000-0000-000000000002'$$,
    ARRAY['active'::public.workspace_membership_status],
    'User membership status should be active after acceptance'
);

-- Test 19: Tasks pending assignments are mapped to user
SELECT results_eq(
    $$SELECT primary_assignee_id FROM public.tasks WHERE id = '99999999-3333-3333-3333-333333333333'$$,
    ARRAY['c0000000-0000-0000-0000-000000000002'::uuid],
    'Pending task assignments should resolve to the user profile'
);

-- Test 20: Double accepting returns exception
SET LOCAL request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000002", "email": "invitee@test.com"}';
SET LOCAL ROLE authenticated;
SELECT throws_ok(
    $$SELECT public.accept_current_user_workspace_invitation('ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee')$$,
    'Invitation is not pending',
    'Re-accepting invitation must throw exception'
);

-- =========================================================================
-- TEST SET 8: Global Device Registration & Notifications Checks
-- =========================================================================

-- Test 21: Device registration runs without active workspace (e.g. for outsider)
SET ROLE postgres;
-- Clear last active workspace of outsider
UPDATE public.profiles SET last_active_workspace_id = NULL WHERE id = 'c0000000-0000-0000-0000-000000000001';

SET LOCAL request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000001", "email": "outsider@test.com"}';
SET LOCAL ROLE authenticated;
SELECT is(
    (SELECT (public.register_current_device('device_hash_xyz', 'Device XYZ', 'Android', '1.0.0', 'token_xyz') ->> 'success')::boolean),
    true,
    'Device registration works without active workspace'
);

-- Test 22: Device registration inserts a global scope notification
SET ROLE postgres;
SELECT results_eq(
    $$SELECT notification_scope FROM public.notifications WHERE user_id = 'c0000000-0000-0000-0000-000000000001' AND title = 'Yeni cihaz girişi'$$,
    ARRAY['global'::public.notification_scope],
    'Device registration notification should be created as global scope'
);

-- =========================================================================
-- TEST SET 9: Ownership Transfer Verification Checks
-- =========================================================================
SET ROLE postgres;

-- Test 23: Transfer ownership to another member demotes owner and promotes member
SET LOCAL request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001", "email": "owner_a@test.com"}'; -- Owner A
SET LOCAL ROLE authenticated;
SELECT is(
    (SELECT (public.transfer_workspace_ownership('a0000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000013') ->> 'success')::boolean), -- Transfer to Member A
    true,
    'transfer_workspace_ownership should execute successfully'
);

-- Test 24: Caller is now Admin, Target is now Owner
SET ROLE postgres;
SELECT results_eq(
    $$SELECT permission_role FROM public.workspace_members WHERE id = 'a0000000-0000-0000-0000-000000000011'$$,
    ARRAY['admin'::public.workspace_permission_role],
    'Eski owner admin rolüne düşürülmeli'
);

SELECT results_eq(
    $$SELECT permission_role FROM public.workspace_members WHERE id = 'a0000000-0000-0000-0000-000000000013'$$,
    ARRAY['owner'::public.workspace_permission_role],
    'Hedef üye owner rolüne yükseltilmeli'
);

-- Finish pgTAP tests
SELECT * FROM finish();

ROLLBACK;
