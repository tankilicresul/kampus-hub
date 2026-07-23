# Flutter App Folder Structure & Route Specification

This document defines the folder structure and routing table for the Kapında Hub Flutter application. It uses a **feature-first** organization, aligning well with clean architecture and modern state management (e.g., Bloc/Cubit).

---

## 1. Directory Structure

```text
lib/
├── main.dart                      # App entry point (initializes services, runs app)
├── app/                           # Root MaterialApp configuration (routes, themes)
│   ├── app.dart                   # MaterialApp config and providers interception
│   ├── router/                    # GoRouter definition and redirect guards
│   └── theme/                     # Light & Dark theme definitions (Kampüs Kapında branding)
├── core/                          # Shared, infrastructure, and core logic
│   ├── async/                     # OperationClass, RetryPolicy, TimeoutPolicy
│   ├── constants/                 # App constants (colors, margins, keys)
│   ├── errors/                    # Exception classes and custom failure handlers
│   ├── logging/                   # AppLogger & SensitiveDataRedactor
│   ├── result/                    # AppResult wrapper
│   ├── utils/                     # Formatters, inactivity trackers, and helpers
│   └── widgets/                   # Universal UI widgets (custom buttons, status badges)
└── features/                      # Domain-specific features
    ├── auth/                      # Google OAuth, MFA, and Biometric lock
    │   ├── data/                  # Auth APIs, local secure storage
    │   ├── domain/                # Auth entity, sign-in/biometric use cases
    │   └── presentation/          # LoginScreen, BiometricPromptScreen, MFAVerifyScreen
    ├── home/                      # Main container with bottom navigation & dashboard
    │   ├── domain/                # Dashboard aggregator models
    │   └── presentation/          # HomeScreen (Today's tasks, notifications list)
    ├── tasks/                     # Task management system (Project -> Task -> Subtask)
    │   ├── data/                  # Task & comment repos
    │   ├── domain/                # Task entities, validation rules
    │   └── presentation/          # TaskBoardScreen (Kanban/List), TaskDetailScreen, TaskCreateScreen
    ├── crm/                       # Partner Business CRM
    │   ├── data/                  # CRM APIs, stage change handlers
    │   ├── domain/                # Business & contract models
    │   └── presentation/          # CRMStagingScreen (Pipeline), BusinessDetailScreen, ContractViewScreen
    ├── daily_updates/             # Daily check-in updates
    │   ├── data/                  # Draft caching & updates API
    │   ├── domain/                # Update schema, draft validations
    │   └── presentation/          # UpdateEditorScreen, DailyUpdatesHistoryScreen
    ├── calendar/                  # Google Calendar scheduling & availability buffers
    │   ├── data/                  # Google Calendar Sync API
    │   ├── domain/                # Working hours models, free/busy calculations
    │   └── presentation/          # SyncAuthorizationScreen, CalendarAvailabilityScreen
    ├── team/                      # Team directories & profiles
    │   └── presentation/          # TeamListScreen, ProfileDetailScreen
    └── performance/               # Performance scores & evaluation metrics
        ├── data/                  # Metrics telemetry repository
        └── presentation/          # PerformanceDashboardScreen, AdminEvaluationForm
```

---

## 2. Navigation Routing Table

We utilize a routing system (such as GoRouter) with explicit **Route Guards** to enforce role-based access.

### Route Guard Definitions
- **AuthGuard:** Redirects to `/login` if session is active or Google OAuth credentials are not found.
- **BiometricGuard:** Prompts biometric check if inactivity timer exceeds 15 minutes.
- **AdminGuard:** Redirects normal users to `/` if attempting to access `/admin/...` or `/crm/contracts`.
- **UniversityGuard:** If user is a `university_representative`, restricts parameters to their assigned university ID.

### Routes Configuration

| Path | Screen | Guards | Allowed Roles |
|---|---|---|---|
| `/login` | `LoginScreen` | None | All |
| `/mfa` | `MFAVerifyScreen` | `AuthGuard` | `admin` |
| `/biometric-lock` | `BiometricPromptScreen` | `AuthGuard` | All |
| `/` or `/home` | `HomeScreen` (Bottom Tab 1) | `AuthGuard`, `BiometricGuard` | All |
| `/projects` | `ProjectsBoardScreen` (Bottom Tab 2) | `AuthGuard`, `BiometricGuard` | All |
| `/projects/:id` | `ProjectDetailScreen` | `AuthGuard`, `BiometricGuard` | All |
| `/tasks/:id` | `TaskDetailScreen` | `AuthGuard`, `BiometricGuard` | All |
| `/universities` | `UniversityListScreen` (Bottom Tab 3) | `AuthGuard`, `BiometricGuard` | All |
| `/universities/:id` | `UniversityDetailScreen` | `AuthGuard`, `BiometricGuard`, `UniversityGuard` | All |
| `/crm/business/:id` | `BusinessDetailScreen` | `AuthGuard`, `BiometricGuard` | All but `university_representative` |
| `/crm/contracts/:id` | `ContractViewScreen` | `AuthGuard`, `BiometricGuard`, `AdminGuard` | `admin` |
| `/calendar` | `CalendarAvailabilityScreen` (Bottom Tab 4) | `AuthGuard`, `BiometricGuard` | All |
| `/daily-updates` | `DailyUpdatesHistoryScreen` | `AuthGuard`, `BiometricGuard` | All |
| `/daily-updates/new` | `UpdateEditorScreen` (Drafts & logs) | `AuthGuard`, `BiometricGuard` | All |
| `/team` | `TeamListScreen` (Bottom Tab 5) | `AuthGuard`, `BiometricGuard` | All |
| `/performance` | `PerformanceDashboardScreen` | `AuthGuard`, `BiometricGuard` | All |
| `/performance/evaluate`| `AdminEvaluationForm` | `AuthGuard`, `BiometricGuard`, `AdminGuard` | `admin` |
| `/trash` | `TrashRecoveryScreen` | `AuthGuard`, `BiometricGuard`, `AdminGuard` | `admin` |

---

## 3. UI Design Guidelines

- **Mobile First:** Optimized for native iOS/Android screens.
- **Theme:** Default light theme with high-contrast readable typography. Dark mode is user-selectable.
- **Task Interaction:**
  - Standard **Kanban board view** for project overview.
  - Alternating **list view** with quick search/filters.
  - Central dynamic `+` button in bottom menu showing options relative to role (e.g., Admins see "Create Project", "Invite User", "Create Task"; Reps see "Propose Task").
