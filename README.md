# Kapında Hub

Kapında Hub is the internal mobile application for the **Kampüs Kapında** team to manage projects, tasks, university openings, partner CRM, technical development, advertisement production, Google Drive files, Google Calendar availability, daily updates, and performance tracking.

The initial pilot will start with 10 users, scaling to support a minimum of 25 users.

## Technology Stack

- **Frontend:** Flutter & FlutterFlow (Mobile UI for Android & iOS)
- **Backend & DB:** Supabase (PostgreSQL, Realtime, Auth, Edge Functions)
- **Authentication:** Google Sign-in with custom access allowlist, mandatory 2FA for Admin roles, and biometric subsequent logins.
- **Push Notifications:** Firebase Cloud Messaging (FCM)
- **File Management:** Google Drive integrations (integrated links, bypassing storage duplication)
- **Calendar Integration:** Google Calendar integration for scheduling and availability.

---

## Working Rules (Çalışma Kuralları)

1. **Plan first:** Before starting any milestone, list the items to be done.
2. **Sequential focus:** Work on only one milestone at a time.
3. **Traceability:** Document every technical change in `WORKLOG.md` (date, process, modified files, test results, next steps).
4. **No half-done work:** Do not move to the next step without fully completing the current one.
5. **No mock code as complete:** Do not treat temporary or fake code as complete.
6. **No unsafe data:** Do not use real user data before securing database row-level security (RLS) policies.
7. **Migrations only:** Database schema must be managed via Supabase migration files in version control.
8. **Analyze and Test:** Run analysis and tests at the end of each milestone. Any compilation/test error means the milestone is incomplete.
9. **Neutral UI for missing pieces:** If there are missing API credentials, branding assets, or accounts, do not mock data; use temporary neutral UI components and log them as missing dependencies.
10. **Approval required:** Do not deploy to production or publish to stores (App Store/Google Play) without explicit user approval.

---

## User Roles (Kullanıcı Rolleri)

- `admin`
- `operations`
- `marketing`
- `social_media`
- `video_editor`
- `software`
- `university_representative`
- `courier_operations`
- `intern`
- `freelancer`

Detailed authorization matrix and database schema are available in the [docs/](file:///c:/Projects/kampus-hub/docs/) directory.

---

## Workspace Layout

```text
kampus-hub/
├── README.md                 # Project Overview (This file)
├── WORKLOG.md                # Technical change tracking sheet
├── task.md                   # Current milestone tasks
├── walkthrough.md            # Execution walkthrough log
├── apps/
│   └── mobile/               # Flutter mobile application
├── docs/                     # Architectural and database planning
│   ├── architecture_decisions.md
│   ├── database_plan.md
│   ├── flutter_structure.md
│   ├── milestones_plan.md
│   ├── missing_dependencies.md
│   ├── milestone_2_verification_report.md
│   ├── milestone_3_implementation_plan.md
│   ├── milestone_3_verification_report.md
│   ├── authentication_architecture.md
│   └── device_security.md
└── supabase/                 # Supabase configuration, migrations & tests
```

---

## Running Local Environment

### Database Verification:
```bash
npx supabase start
npx supabase db reset
npx supabase test db
```

### Flutter Verification:
```bash
cd apps/mobile
flutter pub get
flutter analyze
flutter test
```
