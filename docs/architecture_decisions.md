# Architectural Decisions (ADR) - Kapında Hub

This document defines the key architectural decisions, design choices, and technical strategies for the Kapında Hub application.

---

## 1. Authentication & Security Flow

### Google OAuth Integration
- **Decision:** Initial user authentication will strictly use Google OAuth.
- **Verification Rule:** Supabase triggers will query the `access_invitations` table. If the email doesn't have an active invite, the sign-up/login will be rejected.
- **Owner Account:** The email `resultankilic.business@gmail.com` is configured as the owner/admin account by default.

### Multi-Factor Authentication (MFA)
- **Decision:** Admin roles must undergo two-factor authentication (2FA) via Supabase Auth TOTP or Google 2FA. Access tokens for admins will contain the `mfa` level.

### Session & Biometrics
- **Biometric Auth:** Subsequent logins will allow Face ID/Touch ID (biometric) check to bypass typing credentials.
- **Inactivity Timeout:** A local app timer tracks user inactivity. After 15 minutes of no UI interaction, the app locks and demands biometric verification.
- **Active Device Limit:** Max 2 active devices per user. Upon sign-in, the app registers the device token in `user_devices`. If a 3rd device attempts login, the oldest session is revoked. A notification is pushed to the other active devices upon new device login.

---

## 2. Notification System (Firebase Cloud Messaging)

- **FCM Integration:** Push notifications are managed via Firebase Cloud Messaging.
- **Quiet Hours:** Notifications are muted between **23:00 and 08:00**. Triggers checking notification delivery will queue them for dispatch after 08:00 unless the delivery time occurs during awake hours. No notifications bypass this rule.
- **Task Overdue Flow:**
  - 24 hours before due date: Notify assignee.
  - Day 1 overdue: Notify assignee and Admins.
  - Ongoing overdue: Notify assignee daily.
  - Day 3 overdue: Notify Admins again.

---

## 3. Storage Integration (Google Drive Linkage)

- **Storage Optimization:** To avoid expensive data replication, Kapında Hub will store files in Google Drive.
- **Implementation:**
  - The Supabase DB will only store URLs or Google Drive file IDs.
  - The app will prompt folder creation on Google Drive for each university with specific directory scopes (Araştırma, İşletmeler, Sözleşmeler, Menüler, Reklam Çekimleri, Yayınlanan İçerikler, Raporlar).
  - Admins and authorized roles can view folders directly via Google Drive web views or native links.

---

## 4. Calendar and Availability

- **Google Calendar Sync:** Syncing Google Calendar is mandatory for all team members.
- **Privacy:**
  - Event titles are private by default to all non-owner/non-admin users, showing only `available`, `busy`, or `prefer_not` states.
  - Even Admins cannot see private event titles of other users unless specifically shared, ensuring privacy.
- **Meeting Scheduling:**
  - Minimum meeting length: 30 minutes.
  - Default campus transition buffer: 15 minutes.
  - Inter-campus buffers: Custom configured by each user.
  - Scheduling algorithm runs in Supabase Edge Functions to find mutual slots.

---

## 5. Course Syllabus and Exam Program Parsing

- **Syllabus Parsing:** The app supports PDF, image screenshot, Excel, manual inputs, and Google Calendar sync.
- **Flow:**
  - User uploads file -> Supabase Edge Function runs OCR/Parser -> JSON output containing date/time/subject of exams or classes -> UI displays validation screen to user -> User confirms -> Events are pushed to user's Google Calendar.
  - No calendar event is saved without user confirmation.

---

## 6. Audit Logging and Soft Delete

- **Soft Delete:**
  - All critical tables (tasks, projects, universities, businesses) implement a `deleted_at` timestamp.
  - Items with `deleted_at IS NOT NULL` are excluded from regular queries and are stored for 30 days before hard deletion.
  - Admins can restore these records from a "Trash" view.
- **Audit Logs:**
  - Triggers on tables `tasks`, `businesses`, and `contracts` automatically write insert, update, and delete actions into the `audit_logs` table, storing the actor user ID, timestamp, action type, and record diff.
