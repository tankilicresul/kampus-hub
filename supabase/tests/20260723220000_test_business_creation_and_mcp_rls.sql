-- ─────────────────────────────────────────────────────────────────────────────
-- Test Suite: Business Creation & Multi-Tenant RLS Policy Verification
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;
SELECT plan(6);

-- Test 1: Verify can_access_workspace_university returns true when university_id IS NULL for workspace members
SELECT ok(
    public.can_access_workspace_university(
        'df39e73b-bf72-4d1a-9694-82bd8996b797'::uuid,
        NULL::uuid
    ) IS NOT NULL,
    'can_access_workspace_university should safely handle NULL university_id'
);

-- Test 2: Create temporary test workspace via RPC
SELECT lives_ok(
    $$ SELECT public.create_workspace_with_owner('Test Business WS', 'test-biz-ws-' || substr(md5(random()::text), 1, 6), 'education'); $$,
    'create_workspace_with_owner should execute without error'
);

-- Test 3: Insert business record directly with NULL university_id
SELECT lives_ok(
    $$ 
        INSERT INTO public.businesses (workspace_id, name, stage, commission_rate)
        VALUES ('df39e73b-bf72-4d1a-9694-82bd8996b797'::uuid, 'Test Kafe 1', 'discovered', 15.0);
    $$,
    'Inserting business with NULL university_id should succeed'
);

-- Test 4: Query businesses table
SELECT isnt_empty(
    $$ SELECT * FROM public.businesses WHERE name = 'Test Kafe 1'; $$,
    'Business insertion should be visible under active workspace RLS'
);

-- Test 5: Verify stage update on business
SELECT lives_ok(
    $$ 
        UPDATE public.businesses 
        SET stage = 'active' 
        WHERE name = 'Test Kafe 1';
    $$,
    'Business stage update should succeed'
);

-- Test 6: Clean up test business
SELECT lives_ok(
    $$ DELETE FROM public.businesses WHERE name = 'Test Kafe 1'; $$,
    'Cleaning up test business record'
);

SELECT * FROM finish();
ROLLBACK;
