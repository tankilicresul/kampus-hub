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

## 4. GitHub Push Policy (MANDATORY)
- **Always push after every change**: After completing any file edit, bugfix, feature, or configuration update, ALWAYS run the following sequence without waiting for the user to ask:
  ```
  git add -A
  git commit -m "<concise description of changes>"
  git push origin main
  ```
- **Commit message format**: Use clear, imperative English (e.g. `feat: add favicon.ico`, `fix: resolve 404 on favicon`, `chore: update skill rules`).
- **Never skip the push**: Even for small one-line fixes, always commit and push to keep the remote (`origin/main`) in sync with local work.
- **Scope of rule**: This applies to ALL changes in the `c:\Projects\kampus-hub` workspace, including web, mobile, Supabase, docs, and agent config files.

## 5. GitHub & Supabase MCP / API Directives
- **GitHub MCP Integration**: Proactively use `github-mcp-server` tools (`issue_read`, `issue_write`, `list_issues`, `search_issues`, `search_code`, `list_commits`, `create_pull_request`, etc.) for GitHub repository management, issue tracking, PR operations, and remote code searches.
- **Supabase MCP Integration**: Proactively use `supabase` tools (`execute_sql`, `list_tables`, `search_docs`, `apply_migration`, `list_migrations`, `get_logs`, `get_advisors`, `generate_typescript_types`, etc.) for PostgreSQL database queries, schema analysis, running migrations, retrieving server logs, and project diagnostics.
- **Tool Preference**: Always incline toward leveraging these MCP tools directly whenever handling repository tasks or Supabase database management to ensure accurate, real-time context and execution.

