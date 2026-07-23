# Kampüs Hub — Agent Rules & Skill Trigger Directives (`AGENTS.md`)

This document defines mandatory agent behavior rules, automatic skill discovery guidelines, and architectural policies for all AI pair programming tasks in this workspace.

---

## 1. Automatic Skill Trigger Rules
Whenever performing tasks, the agent MUST inspect and apply available skills in `.agents/skills/` and global customization roots:

- **Database / Supabase Tasks**: Always apply `gemini-skills` (RPC `STABLE` volatility caching, fallback resolvers, compound indexing rules).
- **Flutter / Mobile Development**: Always apply `flutter` and `gemini-skills` (Riverpod `StateNotifierProvider` pattern, clean presentation decoupling, non-blocking UI SnackBar feedback).
- **Android Device & Deployment**: Always apply `android-cli` (ADB wireless pairing `adb pair/connect`, host local IP routing `172.21.164.x`, APK installation diagnostics).

---

## 2. Mandatory Coding Guidelines
1. **Never hardcode emulator loopback IPs** (`10.0.2.2` / `127.0.0.1`) when targeting physical Android devices over Wi-Fi. Always use host machine network IP (`172.21.164.x`).
2. **Never leave mandatory non-null database foreign keys unhandled** in UI creation dialogs. Always supply fallback resolvers or update schema constraints cleanly.
3. **Always preserve 100% test suite integrity**: Rerun `flutter test` and database test suites after every feature or bugfix edit.
