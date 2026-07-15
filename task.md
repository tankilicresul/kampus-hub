# Project Tasks - Kampüs Hub

## Milestone 2: Database Schema & RLS Deployment (Completed)
- [x] Configure local Supabase environment (Docker config).
- [x] Write SQL migrations for all custom types (user roles, task status, etc.).
- [x] Create tables with soft-delete columns (`deleted_at`) and trigger scripts.
- [x] Write Row-Level Security (RLS) policies for all 22 tables.
- [x] Deploy migrations to local Supabase instance.
- [x] Verify triggers compilation and profile sync logic.
- [x] Test SQL queries under different roles (Admin, Operations, Representative) using pgTAP unit tests.
- [x] Split invalid multiple-action RLS policies into valid single-action policies.
- [x] Add schema-level grants for `anon`, `authenticated`, and `service_role`.
- [x] Run database linter and verify zero schema differences with `db diff`.

## Milestone 3A: Local database and Flutter auth scaffold (Completed)
- [x] Initialize mobile folder blueprint under `apps/mobile/` and inspect existing Flutter layout.
- [x] Configure `pubspec.yaml` with required client libraries (`supabase_flutter`, `google_sign_in`, `local_auth`, `flutter_secure_storage`, `go_router`, `flutter_riverpod`, etc.).
- [x] Create environments configuration files (e.g. `.env.example`, `README.md`) detailing client-side key placeholders.
- [x] Implement secure authentication flow routing & screen layouts:
  - [x] Splash, Google Sign-in, Access checking, Access pending, Access denied, Session expired, Biometric validation, Main placeholder, Logout confirmation.
- [x] Verify `access_invitations` table fields and deploy migration for any missing fields.
- [x] Build secure RPC `check_current_user_access()` to validate allowlist and return session status safely.
- [x] Build idempotent profiles trigger to synchronize auth logins securely with user data.
- [x] Implement active device limits on the server-side via `user_devices` table and RPC handlers:
  - [x] `register_current_device()`, `list_current_user_devices()`, `revoke_current_user_device()`.
- [x] Create new device notification triggers on the database.
- [x] Integrate local biometric authentication (fingerprint/face unlock) scaffold inside the app with secure credentials cache logic.
- [x] Set up 15-minute inactivity application lock timer.
- [x] Implement Admin MFA checks placeholder architecture.
- [x] Write Flutter unit/widget tests and database pgTAP tests for all RPC functions and policies.
- [x] Verify local builds (`flutter analyze`, `flutter test`, `supabase reset/lint/test/diff`).

## Milestone 3C-A: Multi-Workspace Foundation and Safe Backfill (Completed)
- [x] Establish the `workspaces` and `workspace_settings` schemas.
- [x] Create the `workspace_members` table and the many-to-many `workspace_member_university_scopes` table.
- [x] Implement `workspace_invitations` and the many-to-many `workspace_invitation_university_scopes` table.
- [x] Implement the `pending_task_assignments` queue checking task-workspace matches via compound foreign keys.
- [x] Add `last_active_workspace_id` to `profiles` and `workspace_id` columns to all scoped tenant tables.
- [x] Perform backfill to default workspace `'df39e73b-bf72-4d1a-9694-82bd8996b797'` ("Kampüs Kapında") and apply `NOT NULL` constraints.
- [x] Sync existing profiles to `workspace_members` and migrate legacy allowlist records to `workspace_invitations`.
- [x] Redefine device registration notifications to link to correct workspaces.
- [x] Set up new multi-tenant indices.
- [x] Write pgTAP verification tests (14 assertions) checking structural features, mapping logic, and constraints.
- [x] Update legacy tests to incorporate workspace fields.
- [x] Reset database, lint schema, and run pgTAP test suites successfully.

## Milestone 3C-B: Tenant RLS, Workspace RPCs and Ownership Security (Completed)
- [x] Separate global and workspace notifications using notification scopes.
- [x] Add `workspace_id` column to audit logs for secure tenant tracing.
- [x] Build secure workspace permission helper functions (`is_active_workspace_member`, `current_workspace_permission_role`, `has_workspace_permission`, `can_access_workspace_university`).
- [x] Apply Row-Level Security (RLS) policies on workspaces core tables.
- [x] Enforce multi-tenant RLS overrides across all 22 tenant-scoped tables.
- [x] Implement Owner Guard trigger protection blocking deletion or demotion of the last active Owner of a workspace.
- [x] Integrate pessimistic locking on workspaces table to prevent race conditions during ownership updates.
- [x] Implement Workspace CRUD RPC APIs (`create_workspace_with_owner`, `list_current_user_workspaces`, `list_current_user_pending_workspace_invitations`).
- [x] Implement Workspace invitation management RPC APIs (`accept_current_user_workspace_invitation`, `accept_workspace_invitation_by_token`, `decline_current_user_workspace_invitation`).
- [x] Implement active workspace and ownership transition RPC APIs (`set_current_user_active_workspace`, `transfer_workspace_ownership`, `leave_current_user_workspace`).
- [x] Decouple global signups and trigger-generated profile mappings from legacy allowlist constraints.
- [x] Setup defaults for initial owner bootstrap on default Kampüs Kapında workspace.
- [x] Secure legacy allowlist table `access_invitations` as read-only/deprecated.
- [x] Sequence invitation accepting to map pending tasks before executing assignments.
- [x] Add narrow trigger bypass for users updating tasks as part of pending assignment resolutions.
- [x] Write pgTAP unit and integration tests (25 assertions) for RLS, RPC APIs, and Owner security trigger rules.
- [x] Update verification, auth, and mapping test suites to adapt to dynamic workspace fixtures and intern default roles.
- [x] Reset database, lint, run all 60 test assertions, and verify empty schema diff.
## Milestone 3C-Bridge: AI Project Continuity and Modular Architecture Foundation

### Phase 3C-Bridge-A: AI Project Memory Documents (Completed)
- [x] Create directory `docs/ai/`.
- [x] Create project onboarding guide `AI_START_HERE.md`.
- [x] Write long-term product memory `PROJECT_MEMORY.md`.
- [x] Document current state and test metrics `CURRENT_STATE.md`.
- [x] Record 12 architecture decisions (ADR) in `DECISIONS.md`.
- [x] Create codebase & core tenant schema layout `ARCHITECTURE_MAP.md`.
- [x] Document git, database validation, and retry rules in `WORKFLOW_RULES.md`.
- [x] Map active integration gaps and legacy profiles in `KNOWN_ISSUES.md`.
- [x] Log supporters array and deprecated schema columns in `TECHNICAL_DEBT.md`.
- [x] Plan bridge and store testing phases in `ROADMAP.md`.
- [x] Document verified test results in `TEST_STATUS.md`.
- [x] Write structured template for session handoffs in `HANDOFF_TEMPLATE.md`.
- [x] Create JSON schema project parameters in `project-state.json`.

### Phase 3C-Bridge-B: Architecture Boundaries, AppFailure and Result Contracts

#### Phase 3C-Bridge-B1: Pure Dart AppFailure and AppResult Contracts (Completed)
- [x] Create `apps/mobile/lib/core/errors/app_failure.dart` defining 11 typed failures and retry hints.
- [x] Create `apps/mobile/lib/core/result/app_result.dart` defining AppResult, AppSuccess, and AppError variants.
- [x] Write pure Dart unit tests verifying Success/Error mapping, folding, and property metadata in `result_and_failure_test.dart`.
- [x] Run flutter analyze and resolve all 11 linter `use_super_parameters` info warnings.

#### Phase 3C-Bridge-B2: FailureMapper, Log and Retry Policies

##### Phase 3C-Bridge-B2.1: Central Failure Mapper (Completed)
- [x] Create `apps/mobile/lib/core/errors/failure_mapper.dart` translating Postgrest, Auth, Socket, Timeout, and Platform exceptions.
- [x] Write 25 unit tests in `failure_mapper_test.dart` verifying all mapper mappings, P0001 pattern matches, and data redactions.
- [x] Rerun flutter analyze and resolve all const linter warnings/errors.

##### Phase 3C-Bridge-B2.2: Retry and Timeout Policies (Completed)
- [x] Create `apps/mobile/lib/core/async/operation_class.dart` classifying safeRead, idempotentWrite, etc.
- [x] Create `apps/mobile/lib/core/async/retry_policy.dart` evaluating RetryAction, backoffs, and pseudo-jitter.
- [x] Create `apps/mobile/lib/core/async/timeout_policy.dart` mapping operational timeout durations using factory bounds.
- [x] Write 38 unit tests in `retry_and_timeout_policy_test.dart` validating all policy decisions, assertions, backoffs, and defaults.
- [x] Run flutter analyze and ensure zero warnings or errors.

##### Phase 3C-Bridge-B2.3: AppLogger and Redaction (Completed)
- [x] Implement AppLogger interface contract.
- [x] Implement log redaction rules removing private credentials (email, tokens, passwords).
- [x] Write unit tests for log output and data redactions.

#### Phase 3C-Bridge-B3: Auth/Device Pilot Integration (Completed)
- [x] Define AuthRepository and DeviceSecurityRepository abstract interfaces in domain layer.
- [x] Implement SupabaseAuthRepository and SupabaseDeviceSecurityRepository in data layer.
- [x] Refactor AuthStateNotifier to depend on repositories rather than raw SDK clients.
- [x] Write 12 repository unit tests verifying all contract mapping and retry logic.
- [x] Update widget and router test mock setups to verify all 20 existing regression tests PASS.

#### Phase 3C-Bridge-B4: Documentation and Verification (Completed)
- [x] Update AI memory current status, roadmap, test logs, and check project-state.json parameters.

#### Phase 3C-Bridge-C: Behavior-preserving Folder Refactor (Completed)
- [x] Prepare Bridge-C behavior-preserving folder refactor plan and baseline file map.
- [x] Refactor folder structure to feature-first layout in small, verifiable steps.
- [x] Ensure UI, router, auth behaviors, and public APIs remain completely unchanged.
- [x] Run flutter analyze and flutter test after each file movement.

#### Phase 3C-Bridge-D: Repository Isolation (Completed)
- [x] Prepare Bridge-D repository isolation scope and dependency-boundary inventory (Bridge-D0).
- [x] Extract direct Supabase client calls from presentation screens and providers (Bridge-D1).
- [x] Prepare Bridge-D2 remaining dependency-boundary scope and identify the next smallest behavior-preserving repository isolation change.
- [x] Broaden repository abstractions across data/domain boundaries.
- [x] Validate presentation layer decoupling through regression test suites.

#### Phase 3C-Bridge-E: Feature Flags & Graceful Degradation (Completed)
- [x] Prepare Bridge-E feature flag and graceful degradation scope and dependency inventory (Bridge-E0).
- [x] Perform release-build bypass audit and identify key security gaps (Bridge-E1).
- [x] Implement release fail-closed security patches for simulate=true, MFA placeholder bypass, and DebugSimulationControls (Bridge-E1B).
- [x] Validate security behaviors and fail-closed fallbacks through final regression test suites (161/161 PASS).

#### Phase 3C-Bridge-F: Documentation & Verification Closure (Completed)
- [x] Prepare Bridge-F final documentation consistency and release-readiness verification checklist.
- [x] Complete module READMEs and finalize modular boundaries documentation.
- [x] Perform comprehensive test suite verification (161/161 Flutter, 60/60 db tests) and code formatting.

## Milestone 3C-C: Flutter onboarding, pending invitations, workspace creation and workspace switcher integration (Completed)
- [x] Prepare 3C-C workspace onboarding switcher scope and implementation plan.
- [x] Implement Flutter UI views and logic for new workspace creation.
- [x] Implement onboarding workspace selector logic for users without any active workspace membership.
- [x] Integrate workspace pending invitations accept/decline screens.
- [x] Implement multi-tenant workspace switcher dashboard side menu panel.
- [x] Configure dynamic GoRouter access redirect guards based on Riverpod providers list changes.
