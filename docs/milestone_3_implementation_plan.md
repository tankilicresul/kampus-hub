# Implementation Plan - Milestone 3: Authentication, Allowlist, Device Security & Biometrics

This plan details the technical steps for implementing Google OAuth authentication, server-side login allowlists, device limits, local biometric locks, and the 15-minute inactivity lock in the Flutter application.

---

## User Review Required

> [!IMPORTANT]
> **Flutter SDK is Missing**: The environment does not have the Flutter SDK installed in the system PATH. We will write all Flutter code and config files in `apps/mobile/`, but local commands (`flutter pub get`, `flutter analyze`, `flutter test`) will fail during validation until the SDK is installed on the host machine.
> We plan to proceed with writing the code and setting up the configurations. Please install the Flutter SDK if you wish to run the compilation and formatting verification commands locally.

> [!NOTE]
> **External Accounts Placeholder Strategy**: Google Cloud client IDs, Firebase FCM keys, Android SHA keys, and Apple IDs will be configured using secure placeholder variables in `.env` and `pubspec.yaml` in accordance with security standards.

---

## Open Questions

1. **How should we handle validation commands if Flutter SDK is not installed on the machine?**
   - *Option A (Recommended)*: Write all code and test files, list Flutter SDK as a missing dependency in `docs/missing_dependencies.md`, and complete the milestone with code-only delivery while skipping local compiling commands until the host is updated.
   - *Option B*: Wait for the user to install the Flutter SDK first, and then execute the plan.

---

## Proposed Changes

We will implement database migrations, secure database RPC functions, mobile application layout, routing/state management, and testing suites.

---

### 1. Database (Supabase) Changes

We will create a new migration file:

#### [NEW] [20260711100000_update_invitations_and_devices.sql](file:///c:/Projects/kampus-hub/supabase/migrations/20260711100000_update_invitations_and_devices.sql)
- **Table Alterations**:
  - Update `access_invitations`:
    - Add `role` (`user_role`), copying existing `invited_role` values, then drop `invited_role`.
    - Add `university_id` (`UUID`, FK references `universities`).
    - Add `is_active` (`BOOLEAN`, defaults to `true`). Migrate values from the old `status` column, then drop `status`.
    - Add `invited_by` (`UUID`, FK references `profiles`).
    - Add `invited_at` (`TIMESTAMPTZ`, default `now()`).
    - Add `accepted_at` (`TIMESTAMPTZ`).
  - Update `user_devices`:
    - Add `device_identifier_hash` (`TEXT`, unique).
    - Add `platform` (`TEXT`).
    - Add `app_version` (`TEXT`).
    - Add `first_seen_at` (`TIMESTAMPTZ`, default `now()`).
    - Add `is_active` (`BOOLEAN`, default `true`).
    - Add `revoked_at` (`TIMESTAMPTZ`).
    - Add `push_token` (`TEXT`).
    - Rename `last_active_at` to `last_seen_at`.
    - Drop `device_token` (migrated to `device_identifier_hash`).
- **New Table**:
  - `notifications` table for tracking device activities and system alerts:
    - `id` (uuid, PK)
    - `user_id` (uuid, FK references profiles)
    - `title` (text)
    - `body` (text)
    - `is_read` (boolean, default false)
    - `created_at` (timestamptz, default now)
- **Trigger Updates**:
  - Update `handle_new_user()` function to match the new `access_invitations` table columns. It will fetch the user's role and university from the invite list, insert them into `profiles`, and stamp the invitation's `accepted_at` timestamp.
- **Secure RPC Functions**:
  - `check_current_user_access()`: Resolves authenticated email, checks active allowlist status and expiration, and returns validation reasons (`active`, `not_invited`, `inactive`, `expired`, `profile_missing`). Mark as `SECURITY DEFINER` and restrict execute access to `authenticated` role.
  - `register_current_device(...)`: Enforces the max 2 active devices rule on the server side. Re-activates existing matching devices, validates limits, and logs new device alerts in `notifications` on successful registrations.
  - `list_current_user_devices()`: Returns active and historical device metadata for the caller user.
  - `revoke_current_user_device(device_id)`: Marks a specified device as inactive/revoked.

---

### 2. Mobile (Flutter) Layout Setup

We will create a new Flutter project skeleton inside `apps/mobile/` conforming to a feature-first architecture using Riverpod and GoRouter.

#### [NEW] [pubspec.yaml](file:///c:/Projects/kampus-hub/apps/mobile/pubspec.yaml)
- Configure application metadata and packages:
  - Core: `supabase_flutter`, `flutter_riverpod`, `go_router`, `flutter_secure_storage`
  - Integration & Hardware: `google_sign_in`, `local_auth`, `device_info_plus`, `connectivity_plus`, `uuid`, `intl`
  - Code Gen: `freezed_annotation`, `json_annotation` (under dependencies); `freezed`, `json_serializable`, `build_runner` (under dev_dependencies).

#### [NEW] [main.dart](file:///c:/Projects/kampus-hub/apps/mobile/lib/main.dart)
- Initializes Supabase configuration, loads secure settings, handles global error triggers, and runs the application under a Riverpod `ProviderScope`.

#### [NEW] [app.dart](file:///c:/Projects/kampus-hub/apps/mobile/lib/app.dart)
- Configures `MaterialApp.router` with themes and loads the central GoRouter routing table.

#### [NEW] [app_router.dart](file:///c:/Projects/kampus-hub/apps/mobile/lib/core/router/app_router.dart)
- Outlines the GoRouter navigation rules, including:
  - **AuthGuard**: Checks active session state and redirects to `/login` if empty.
  - **BiometricGuard**: Redirects to the biometric unlock screen if the inactivity timer exceeds 15 minutes.
  - **AdminGuard**: Intercepts paths like `/crm/contracts` or `/admin/...` for non-admin accounts.

#### [NEW] [auth_state_notifier.dart](file:///c:/Projects/kampus-hub/apps/mobile/lib/features/auth/presentation/auth_state_notifier.dart)
- Manages the authentication state machine, including credentials, allowlist checks via `check_current_user_access()`, device verification registrations, and session lifetimes.

#### [NEW] Screens
- Setup basic layouts under `lib/features/auth/presentation/screens/`:
  - `LoginScreen`: UI containing Google Sign-in trigger and placeholder simulation panel.
  - `AccessCheckingScreen`: Intermediary loading screen while resolving allowlist check results.
  - `AccessWaitingScreen`: Display for unapproved accounts.
  - `AccessDeniedScreen`: Display for rejected/blocked accounts.
  - `AccountExpiredScreen`: Display for expired invitation terms.
  - `BiometricPromptScreen`: UI for face/fingerprint lock checks, including "skip this time" and fallback modes.
  - `MfaPlaceholderScreen`: Flow block for admin accounts lacking high MFA assurance level.

#### [NEW] [inactivity_tracker.dart](file:///c:/Projects/kampus-hub/apps/mobile/lib/core/utils/inactivity_tracker.dart)
- Listens to app lifecycle states (`AppLifecycleState.paused` / `AppLifecycleState.resumed`) and pointer interactions. Stores timestamp details inside secure storage and forces lock redirection if 15 minutes pass.

---

## Verification Plan

### Database & Security Verification
We will add pgTAP tests directly to verify the security and RPC behaviors:

#### [NEW] [20260711110000_test_milestone3.sql](file:///c:/Projects/kampus-hub/supabase/tests/20260711110000_test_milestone3.sql)
- **Test 1**: Verify `check_current_user_access()` returns `not_invited` for non-existing emails.
- **Test 2**: Verify `check_current_user_access()` returns `inactive` for disabled entries in the allowlist.
- **Test 3**: Verify `check_current_user_access()` returns `expired` when `expires_at` is in the past.
- **Test 4**: Verify profiles are created idempotently on auth synchronizations.
- **Test 5**: Verify `register_current_device()` registers device 1 and device 2 successfully.
- **Test 6**: Verify `register_current_device()` returns `DEVICE_LIMIT_REACHED` on attempts to register a 3rd active device.
- **Test 7**: Verify `revoke_current_user_device()` marks a device as inactive, allowing a new device to register.
- **Test 8**: Verify user cannot query or revoke other users' devices.
- **Test 9**: Verify successful device registration triggers entry in `notifications` table.

We will run the local verification suite:
```bash
npx supabase db reset
npx supabase db lint --local --level warning --fail-on warning
npx supabase test db
npx supabase db diff --local
```

### Mobile App Verification
We will write mockable unit tests for state machines and routes:

#### [NEW] [auth_test.dart](file:///c:/Projects/kampus-hub/apps/mobile/test/auth_test.dart)
- Validates the auth state transitions based on mock allowlist responses and device validation limits.
- Validates the 15-minute inactivity tracker trigger calculation.
