-- pgTAP Database Test Suite for Performance Optimizations & Helper Functions
BEGIN;
SELECT plan(6);

-- Test 1: Check helper functions exist and are executable
SELECT has_function('is_active_workspace_member', ARRAY['uuid']);
SELECT has_function('current_workspace_permission_role', ARRAY['uuid']);

-- Test 2: Check function volatility is 's' (STABLE)
SELECT results_eq(
    'SELECT provolatile FROM pg_proc WHERE proname = ''is_active_workspace_member''',
    ARRAY['s'::char],
    'is_active_workspace_member must be declared STABLE for RLS query caching'
);

SELECT results_eq(
    'SELECT provolatile FROM pg_proc WHERE proname = ''current_workspace_permission_role''',
    ARRAY['s'::char],
    'current_workspace_permission_role must be declared STABLE'
);

-- Test 3: Check performance compound indexes exist
SELECT has_index('workspace_members', 'idx_workspace_members_user_ws_active');
SELECT has_index('daily_updates', 'idx_daily_updates_ws_created');

SELECT * FROM finish();
ROLLBACK;
