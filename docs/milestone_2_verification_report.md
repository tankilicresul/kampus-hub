# Milestone 2 Verification Report - Kapında Hub

This report documents the verification results of Milestone 2 (Database Schema, Row-Level Security, and Triggers) based on the local Supabase environment runs.

---

## 1. Migration Status
All migrations were successfully deployed on the local Postgres instance:
- **`20260710120000_init_schema.sql`**: Configured all 22 custom tables, enums, relationships, and performance indexes.
- **`20260710130000_triggers.sql`**: Implemented triggers for profiles synchronization (on auth registration), audit logging, and daily updates version tracking.
- **`20260710140000_rls_policies.sql`**: Deployed RLS policies for all 22 tables.

### 🔧 Fixes Applied During Execution:
1. **RLS Policy Syntax Split**:
   In `20260710140000_rls_policies.sql`, the policy `"Normal roles can view and update businesses"` originally used `FOR SELECT, UPDATE`. Postgres RLS syntax only permits one action type (or `FOR ALL`) per statement.
   - **Fix**: Split the policy into two distinct policies: `"Normal roles can view businesses" (FOR SELECT)` and `"Normal roles can update businesses" (FOR UPDATE)`.
2. **Table-Level Privilege Grants**:
   To prevent immediate SQL-level permission denied errors before RLS is checked, the following grants and default privileges were appended to the policy migration:
   ```sql
   GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
   GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
   GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
   GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
   ```

---

## 2. Lint Status
Running `npx supabase db lint --local --level warning --fail-on warning` completed with **zero errors and warnings**:
- **Schema `public`**: Clean
- **Schema `extensions`**: Clean

```json
{"results":[],"message":"db lint"}
```

---

## 3. Test Status & RLS Role Checks
Local pgTAP testing was executed via `npx supabase test db` against `supabase/tests/20260710150000_test_verification.sql`. All **9 test assertions** successfully passed.

| Role Context | Test Target | Assertion Type | Expected Behavior | Result |
| :--- | :--- | :--- | :--- | :--- |
| **Uni Representative** | Active University | `results_eq` | Can only view their assigned active university | **PASS** |
| **Uni Representative** | Projects | `results_eq` | Can only view projects linked to their university | **PASS** |
| **Uni Representative** | Contracts | `throws_ok (42501)`| Denied insertion of contracts | **PASS** |
| **Operations** | Active Universities | `results_eq` | Can view non-deleted universities | **PASS** |
| **Operations** | Contracts | `is_empty` | Denied reading of contract records | **PASS** |
| **Operations** | Task Status Update | `lives_ok` | Can update the status of assigned tasks | **PASS** |
| **Operations** | Task Project Change | `throws_ok (P0001)`| Denied changing `project_id` on task (trigger block) | **PASS** |
| **Admin** | Universities | `results_eq` | Can view active AND soft-deleted universities | **PASS** |
| **Admin** | Contracts | `results_eq` | Can read all contracts successfully | **PASS** |

**Summary Output:**
```text
Connecting to local database...
/Projects/kampus-hub/supabase/tests/20260710150000_test_verification.sql .. ok
All tests successful.
Files=1, Tests=9,  1 wallclock secs
Result: PASS
```

---

## 4. Schema Coverage
The implemented schema fully covers the system blueprint:
- **Types**: 5 custom Postgres enums (`user_role`, `task_priority`, `task_status`, `business_stage`, `performance_period`, `request_status`).
- **Tables**: 22 core tables covering Access Management, Devices, Universities, CRM, Tasks, Comments, Requests, Versioned Daily Updates, Availability/Meetings, and Audit Logs.
- **Indexes**: Specific indexes on foreign keys and commonly filtered columns (e.g. `deleted_at`, `status`, `role`) ensure optimal query execution speeds.
- **Verification of db diff**: `npx supabase db diff --local` reports **no differences** between our migration files and the active database schema:
  ```json
  {"diff":"","file":null,"schemas":[],"engine":"pg-delta","dropStatements":[],"message":"Diff complete."}
  ```

---

## 5. Remaining Risks & Recommendations
1. **Windows Docker Networking (Logflare / Analytics)**:
   - *Risk*: The Supabase local analytics service (Logflare) failed to boot initially on Windows because it requires the Docker daemon socket to be exposed at `tcp://localhost:2375`.
   - *Mitigation*: Disabled `analytics` in `supabase/config.toml` for local development. This has no effect on the database migrations/testing and ensures smooth container startup.
   - *Action Item*: Re-enable when deploying to production environments or systems running Linux/MacOS where Docker network sharing is native.
2. **Auth Setup Dependency**:
   - *Risk*: While RLS and tables are ready, the profile creation trigger (`on auth.users created`) requires actual integrations with Supabase auth metadata.
   - *Mitigation*: Mocked in test assertions. This is a primary focus for Milestone 3 (Google OAuth setup).
3. **Trigger Performance**:
   - *Risk*: Trigger validations (such as non-admin updates blocker on tasks) run on every update.
   - *Mitigation*: Secured through PL/pgSQL functions marked as `SECURITY DEFINER` and optimized conditionals. We must monitor this trigger under bulk updates.
