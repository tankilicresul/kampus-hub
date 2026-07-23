---
name: gemini-skills
description: Integrated Gemini Skills ecosystem for advanced agentic coding, database RPC optimization, Flutter architecture, and local testing.
---

# Gemini Skills Suite

This skill set integrates the official and community `gemini-skills` guidelines:

## 1. Flutter & Clean Architecture
- **State Management**: Riverpod `StateNotifierProvider` pattern with immutable states (`freezed` / `copyWith`).
- **Domain Decoupling**: View layer connects ONLY to Notifiers/Repositories. Never call Supabase directly in Widgets.
- **Fail-Safe UI**: Fallback workspace IDs (`df39e73b-bf72-4d1a-9694-82bd8996b797`) and non-blocking SnackBar notifications for async actions.

## 2. Supabase & PostgreSQL Performance
- **RLS Function Volatility**: Mark security helper functions as `STABLE` for statement-level evaluation caching.
- **Foreign Key Flexibility**: Make optional associations (`university_id`, `assigned_user_id`) nullable on insert with automatic fallback resolvers.
- **Compound Indexes**: Maintain indexes on `(workspace_id, created_at DESC)` and `(workspace_id, status, priority)`.

## 3. Physical Device & Wireless Debugging
- **Host Local IP**: Always map Supabase URLs to the local host machine IP (e.g., `http://172.21.169.249:54321`) instead of emulator-only `10.0.2.2`.
- **ADB Wireless Port**: Pair once with `adb pair ip:pairing_port`, connect to `adb connect ip:main_port`.
