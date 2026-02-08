# Plan: M6 To-do 6 — Action trigger UI (implemented)

**Goal:** In the iOS app, a way to trigger one or more actions for the session. Triggering MUST log a run to actions.jsonl (id, action, created_at, status) per [ACTIONS.md](../../codex/ACTIONS.md).

**Spec:** [milestone-06-ios-app-core.md](../../milestones/milestone-06-ios-app-core.md) to-do 6.

**Implemented:** Branch feature/m06-todo6-action-trigger-ui.

- **ActionRunWriter** — appendActionRun(sessionRoot:actionId:) appends to actions.jsonl: id (ULID), action, created_at (RFC 3339), status "started"; creates file if missing.
- **ActionsView** — List of triggerable actions (e.g. "Generate digest" → "generate_digest"); on tap appends run, shows success/error message.
- **ContentView** — "Actions" NavigationLink from playback view to ActionsView(sessionRoot:).

CLI build and 35 tests pass.
