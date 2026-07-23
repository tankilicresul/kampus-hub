# Device Security & Session Revocation - Kapında Hub

This document explains the device seat limits, server-side registration rules, local biometric authentication, and inactivity lockouts configured for Kapında Hub.

---

## 1. Active Device Limit (Max 2 Seats)

To prevent unauthorized account sharing, each user is restricted to a maximum of **2 active devices** at any given time.

### Database Constraint Schema:
- Devices are registered in the `user_devices` table.
- Device identity is verified using a SHA-256 hash of unique hardware characteristics (`device_identifier_hash`) along with metadata such as platform (Android/iOS) and application version.

### Device Registration Flow (`register_current_device` RPC):
1. Client calculates and sends the hardware identifier hash and metadata.
2. The database RPC verifies if a device record already exists for the user with the same identifier hash:
   - If a record exists, it updates `last_seen_at = now()`, sets `is_active = true`, and returns success.
3. If no matching record exists, it checks the count of the user's currently active devices (`is_active = true` and `revoked_at IS NULL`):
    - If the count is **less than 2**, a new device record is inserted, a new device notification audit log is generated globally in `notifications` (setting `notification_scope = 'global'` and `workspace_id = NULL`), and it returns success.
    - If the count is **equal to or greater than 2**, it blocks registration and returns a status code of `DEVICE_LIMIT_REACHED`.

---

## 2. Session Revocation & Seat Reallocation

When a user reaches their device limit, they must revoke an existing device to register a new one:

1. **Active Devices List**: The app fetches active devices using the `list_current_user_devices()` RPC.
2. **Revocation Call**: The user triggers revocation of a selected device using `revoke_current_user_device(device_id)`.
3. **Database Execution**:
   - The RPC updates `user_devices` setting `is_active = false` and `revoked_at = now()`.
   - RLS policies ensure that the caller can only revoke device records associated with their own `user_id` (`auth.uid()`).
4. **Seat Release**: Once revoked, the count of active devices drops to 1, immediately enabling the registration of a new device.

---

## 3. Local Biometrics & 15-Minute Inactivity Lock

To protect against physical device access compromises, the application implements local device authentication and inactivity timeouts:

### 15-Minute Inactivity Tracker:
- **Interaction Monitoring**: The application is wrapped in a top-level `GestureDetector` that resets the last interaction timestamp on tap, scroll, or pan actions.
- **App Lifecycle Listeners**: The system listens to state transitions (`AppLifecycleState`):
  - When the app is paused (backgrounded), the current timestamp is written to `FlutterSecureStorage`.
  - When the app resumes (foregrounded), the system compares the current time against the stored background timestamp.
- **Lock Out Trigger**: If the elapsed background time exceeds **15 minutes (900 seconds)**, the `AuthState` is set to `biometricLocked`.

### Biometric Unlock Flow:
- **Biometric Request**: If `AuthState.status` is `biometricLocked`, GoRouter redirects all paths to `/biometric-lock`.
- **Local Authentication**: The screen calls the `local_auth` package to trigger face or fingerprint recognition.
- **Passphrase Fallback**: If biometric authentication is unavailable or fails, users can input their fallback device passcode to unlock the app.
