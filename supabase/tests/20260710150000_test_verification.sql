-- AUTOMATED VERIFICATION TEST SCRIPT FOR MILESTONE 2
-- This script validates custom triggers, profiles sync, Row Level Security (RLS), and soft-delete filters using pgTAP.

BEGIN;

-- Plan the number of tests
SELECT plan(9);

-- =========================================================================
-- STEP 1: Seed Mock Data under postgres role (superuser)
-- =========================================================================
SET ROLE postgres;

-- 1. Seeding mock data using PL/pgSQL to dynamically retrieve 'kampus-kapinda' workspace
DO $$
DECLARE
    v_ws_id UUID;
    v_member_ops_id UUID := gen_random_uuid();
    v_member_rep_id UUID := gen_random_uuid();
    v_member_owner_id UUID := gen_random_uuid();
BEGIN
    SELECT id INTO v_ws_id FROM public.workspaces WHERE slug = 'kampus-kapinda' LIMIT 1;
    IF v_ws_id IS NULL THEN
        RAISE EXCEPTION 'Workspace kampus-kapinda not found';
    END IF;

    -- access_invitations seeding
    INSERT INTO public.access_invitations (email, is_active, role) VALUES
    ('owner@test.com', true, 'admin'),
    ('operations@test.com', true, 'operations'),
    ('representative@test.com', true, 'university_representative'),
    ('external@test.com', false, 'intern')
    ON CONFLICT (email) DO NOTHING;

    -- Profiles seeding
    INSERT INTO public.profiles (id, email, role, full_name, last_active_workspace_id) VALUES
    ('00000000-0000-0000-0000-000000000001', 'owner@test.com', 'admin', 'Owner Admin', v_ws_id),
    ('00000000-0000-0000-0000-000000000002', 'operations@test.com', 'operations', 'Ops User', v_ws_id),
    ('00000000-0000-0000-0000-000000000003', 'representative@test.com', 'university_representative', 'Uni Rep', v_ws_id)
    ON CONFLICT (id) DO UPDATE SET 
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        last_active_workspace_id = EXCLUDED.last_active_workspace_id;

    -- Workspace membership seeding
    IF NOT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = v_ws_id AND user_id = '00000000-0000-0000-0000-000000000001') THEN
        INSERT INTO public.workspace_members (id, workspace_id, user_id, permission_role, job_role, custom_job_role, membership_status)
        VALUES (v_member_owner_id, v_ws_id, '00000000-0000-0000-0000-000000000001', 'admin', 'custom', 'Test Admin', 'active');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = v_ws_id AND user_id = '00000000-0000-0000-0000-000000000002') THEN
        INSERT INTO public.workspace_members (id, workspace_id, user_id, permission_role, job_role, custom_job_role, membership_status)
        VALUES (v_member_ops_id, v_ws_id, '00000000-0000-0000-0000-000000000002', 'member', 'operations', NULL, 'active');
    END IF;
    
    SELECT id INTO v_member_ops_id FROM public.workspace_members WHERE workspace_id = v_ws_id AND user_id = '00000000-0000-0000-0000-000000000002';

    IF NOT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = v_ws_id AND user_id = '00000000-0000-0000-0000-000000000003') THEN
        INSERT INTO public.workspace_members (id, workspace_id, user_id, permission_role, job_role, custom_job_role, membership_status)
        VALUES (v_member_rep_id, v_ws_id, '00000000-0000-0000-0000-000000000003', 'member', 'university_representative', NULL, 'active');
    END IF;

    SELECT id INTO v_member_rep_id FROM public.workspace_members WHERE workspace_id = v_ws_id AND user_id = '00000000-0000-0000-0000-000000000003';

    -- Universities seeding
    INSERT INTO public.universities (id, name, city, drive_folder_id, workspace_id) VALUES
    ('11111111-1111-1111-1111-111111111111', 'University A', 'Istanbul', 'drive-uni-a', v_ws_id),
    ('22222222-2222-2222-2222-222222222222', 'University B', 'Ankara', 'drive-uni-b', v_ws_id)
    ON CONFLICT (id) DO NOTHING;

    -- Associate representative with University A in profiles
    UPDATE public.profiles 
    SET university_id = '11111111-1111-1111-1111-111111111111' 
    WHERE id = '00000000-0000-0000-0000-000000000003';

    -- Member scopes mapping
    INSERT INTO public.workspace_member_university_scopes (workspace_member_id, university_id, created_by)
    VALUES (v_member_rep_id, '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001')
    ON CONFLICT (workspace_member_id, university_id) DO NOTHING;

    -- Projects seeding
    INSERT INTO public.projects (id, university_id, name, description, workspace_id) VALUES
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Uni A Launch', 'Launch campaign for A', v_ws_id),
    ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Uni B Launch', 'Launch campaign for B', v_ws_id)
    ON CONFLICT (id) DO NOTHING;

    -- Businesses & Contracts seeding
    INSERT INTO public.businesses (id, university_id, name, stage, commission_rate, workspace_id) VALUES
    ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Cafe A', 'discovered', 15.00, v_ws_id),
    ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 'Cafe B', 'agreement_reached', 12.00, v_ws_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.contracts (id, business_id, document_url, workspace_id) VALUES
    ('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', 'drive-link-contract-a', v_ws_id)
    ON CONFLICT (id) DO NOTHING;

    -- Tasks seeding
    INSERT INTO public.tasks (id, project_id, university_id, title, status, primary_assignee_id, workspace_id) VALUES
    ('88888888-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Setup Ads Uni A', 'todo', '00000000-0000-0000-0000-000000000002', v_ws_id)
    ON CONFLICT (id) DO NOTHING;
END $$;



-- =========================================================================
-- STEP 2: Verify Soft Delete Constraints
-- =========================================================================
-- Soft-delete University B
UPDATE public.universities SET deleted_at = now() WHERE id = '22222222-2222-2222-2222-222222222222';


-- =========================================================================
-- STEP 3: Verify RLS - University Representative Role Context
-- =========================================================================
-- Simulate auth.uid() = representative@test.com
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
SET LOCAL ROLE authenticated;

-- Test A: Selecting Universities
-- Representative should ONLY see University A (since B is deleted, and representative belongs only to A)
SELECT results_eq(
    'SELECT name FROM public.universities',
    ARRAY['University A'],
    'Uni Representative should only see their active assigned university'
);

-- Test B: Selecting Projects
-- Representative should ONLY see Projects under University A (since they are locked to Uni A)
SELECT results_eq(
    'SELECT name FROM public.projects',
    ARRAY['Uni A Launch'],
    'Uni Representative should only see projects for their assigned university'
);

-- Test C: Inserting Contract
-- Representative should FAIL to insert a contract (expected RLS violation error code 42501)
SELECT throws_ok(
    $$INSERT INTO public.contracts (id, business_id, document_url) VALUES ('99999999-9999-9999-9999-999999999999', '55555555-5555-5555-5555-555555555555', 'malicious-link')$$,
    '42501',
    NULL,
    'Uni Representative cannot insert contracts'
);


-- =========================================================================
-- STEP 4: Verify RLS - Operations Role Context
-- =========================================================================
SET ROLE postgres;
-- Simulate auth.uid() = operations@test.com
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
SET LOCAL ROLE authenticated;

-- Test A: Selecting Universities
-- Operations should see University A (but not B because B is soft-deleted)
SELECT results_eq(
    'SELECT name FROM public.universities',
    ARRAY['University A'],
    'Operations role should only see non-deleted universities'
);

-- Test B: Accessing Contracts
-- Operations role is NOT allowed to read contracts (should return 0 rows)
SELECT is_empty(
    'SELECT document_url FROM public.contracts',
    'Operations role should see 0 contract rows due to RLS'
);

-- Test C1: Updating Task fields (allowed status update)
-- Operations user is primary assignee of task 88888888-8888-8888-8888-888888888888.
SELECT lives_ok(
    $$UPDATE public.tasks SET status = 'in_progress' WHERE id = '88888888-8888-8888-8888-888888888888'$$,
    'Operations assignee can update task status'
);

-- Test C2: They CANNOT change project_id (expected trigger exception code P0001)
SELECT throws_ok(
    $$UPDATE public.tasks SET project_id = '44444444-4444-4444-4444-444444444444' WHERE id = '88888888-8888-8888-8888-888888888888'$$,
    'P0001',
    NULL,
    'Operations assignee cannot change project_id'
);


-- =========================================================================
-- STEP 5: Verify RLS - Admin Role Context
-- =========================================================================
SET ROLE postgres;
-- Simulate auth.uid() = owner@test.com (Admin)
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;

-- Test A: Selecting Universities
-- Admin bypasses soft delete filter in custom logic, seeing both A and B.
SELECT results_eq(
    'SELECT name FROM public.universities ORDER BY name',
    ARRAY['University A', 'University B'],
    'Admin role can see both active and soft-deleted universities'
);

-- Test B: Accessing Contracts
-- Admin reads contract details successfully
SELECT results_eq(
    'SELECT document_url FROM public.contracts',
    ARRAY['drive-link-contract-a'],
    'Admin role can read contracts'
);

-- Finish pgTAP tests
SELECT * FROM finish();

ROLLBACK;
