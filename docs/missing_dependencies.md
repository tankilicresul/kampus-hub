# Missing Accounts, APIs & Brand Assets Log - Kapında Hub

Adhering to **Rule 12**, this document tracks all missing accounts, API integrations, and brand assets. We explicitly avoid faking information. For any missing visual or system component, neutral temporary components (e.g., grays, slates, basic skeletons) will be utilized.

---

## 1. Brand Assets

| Asset Name | Status | Temporary UI Treatment | Required From |
|---|---|---|---|
| **Kampüs Kapında Logo** | Missing | Gray box skeleton placeholder with text `"Kampüs Kapında Logo"` | Marketing / Design Team |
| **Corporate Color Palette** | Missing | System uses neutral grays, slate, and clean white backgrounds. No colors are guessed or assumed. | Marketing / Design Team |
| **Typography Specification** | Missing | System uses default clean sans-serif/system fonts (e.g., Roboto/Inter). | Design Team |

---

## 2. API Integrations, Credentials & Build Environments

| Credential/Environment Name | Status | Temporary System Behavior | Required From |
|---|---|---|---|
| **Android SDK / toolchain** | Missing | Android APK build (`flutter build apk`) cannot compile on this host. | Local Developer Machine / Android Studio setup |
| **Xcode / macOS Command Line Tools** | Missing | iOS compilation is blocked; cannot run build commands for iOS on Windows. | Apple Dev Hardware / macOS Machine |
| **Google Cloud Project** | Missing | Google OAuth login cannot be initialized on devices. System fails with `"Auth Config Missing"` warning. | SysAdmin / Owner |
| **Google OAuth Client IDs** | Missing | Client OAuth login will display a simulation banner in test builds to bypass check. | SysAdmin / Owner |
| **Firebase Cloud Messaging Key** | Missing | Push notifications will output to system console logs instead of sending network requests. | SysAdmin |
| **Google Service Account JSON** | Missing | File syncing/Google Drive folder uploads will log action and print drive link placeholders in console. | Google Cloud Admin |
| **Docker Desktop / Engine** | Active / Running | Running locally. Supabase successfully started and RLS/triggers verified. | Local Developer Machine |

---

## 3. Account Roles Configuration

The initial setup requires four Admin accounts. Only the primary owner has been specified:
- Primary Owner: `resultankilic.business@gmail.com`
- Admin 2: *TBD*
- Admin 3: *TBD*
- Admin 4: *TBD*

*All unresolved accounts will remain unconfigured until the owner explicitly provides email coordinates.*
