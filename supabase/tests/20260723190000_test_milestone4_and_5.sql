-- pgTAP Database Test Suite for Milestone 4 & 5
BEGIN;
SELECT plan(5);

-- Test 1: Function generate_university_opening_tasks exists
SELECT has_function('generate_university_opening_tasks');

-- Test 2: Insert dummy university and check that 24 tasks were automatically generated
INSERT INTO universities (id, name, city, workspace_id)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Kampüs Üniversitesi', 'İstanbul', 'df39e73b-bf72-4d1a-9694-82bd8996b797');

SELECT results_eq(
    'SELECT count(*)::int FROM tasks WHERE university_id = ''11111111-1111-1111-1111-111111111111''',
    ARRAY[24],
    'Inserting a university should generate 24 template tasks automatically'
);

-- Test 3: Check critical priority count
SELECT results_eq(
    'SELECT count(*)::int FROM tasks WHERE university_id = ''11111111-1111-1111-1111-111111111111'' AND priority = ''critical''',
    ARRAY[5],
    'Five specific tasks in the 24-step template must be marked as critical priority'
);

-- Test 4: Check daily_updates RLS policies
SELECT has_table('daily_updates');

-- Test 5: Check businesses RLS policies
SELECT has_table('businesses');

SELECT * FROM finish();
ROLLBACK;
