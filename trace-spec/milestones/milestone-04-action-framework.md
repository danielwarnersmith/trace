# Milestone 4: Action framework (extensible)

**Goal:** Extend the action system so actions are discoverable and extensible; optional scheduled or event-based triggers; draft-only outputs with no auto-publishing.

**Spec/codex references:**

- [trace-spec/ROADMAP.md](../ROADMAP.md) — §6 Action framework (extensible): explicit user-triggered actions (already in CLI), optional scheduled/event-based actions, draft-only outputs, no publishing.
- [trace-spec/codex/ACTIONS.md](../codex/ACTIONS.md) — Action runs logged to actions.jsonl; user-invoked; optional.

**Existing implementation:**

- CLI: `trace action run <dir> <action-id> [--input key=value ...]` in [src/commands/action-run.ts](../../src/commands/action-run.ts). Actions are registered in code; runs logged to actions.jsonl. Digest generation includes Recent actions from actions.jsonl.

---

## To-dos

### 1. Action registry or discovery (extensible actions)

**Read:** [trace-spec/codex/ACTIONS.md](../codex/ACTIONS.md) — "Actions MUST be optional; the system may ship with zero built-in actions."

**Implement:** A way to register or discover actions so new actions can be added without changing core CLI code (e.g. config file listing action ids and handlers, or plugin directory). If the current hardcoded registry is acceptable for now, document it and add a short "Adding actions" note; otherwise introduce a minimal registry (e.g. session or repo-level actions config that maps action-id to a script or built-in name). Goal: clarify how to add a new action.

**Where:** [src/commands/action-run.ts](../../src/commands/action-run.ts) and/or new `src/actions/` or config under trace-spec. Document in README or docs/.

**Done when:** Either (a) documented how to add actions (current code path), or (b) a minimal registry/config exists and `trace action run <dir> <action-id>` can invoke a registered action from config. No new built-in actions required; extensibility is the deliverable.

---

### 2. Draft-only outputs (no publishing)

**Read:** ROADMAP — "Draft-only outputs. No publishing."

**Implement:** Ensure action outputs (e.g. digest, exported files) are written only to session or user-controlled paths and never auto-published (no upload, no push, no side channel). Document or enforce: action run results go to session dir or a designated draft dir; no publishing step in the action framework.

**Where:** [trace-spec/codex/ACTIONS.md](../codex/ACTIONS.md) (add principle if missing); [src/commands/action-run.ts](../../src/commands/action-run.ts) or action contract. Optional: add a one-line check or doc that outputs are local/draft only.

**Done when:** Codex or spec states that action outputs are draft-only and not published; existing action run behavior complies (writes only to session/local paths).

---

### 3. Optional scheduled or event-based trigger (stub or design)

**Read:** ROADMAP — "Optional scheduled/event-based actions."

**Implement:** Design or stub for triggering actions by schedule or event (e.g. "after session close" or "every N minutes") without implementing a full scheduler. Options: (a) Add a short design note in trace-spec (when/how scheduled actions would run; out of scope for CLI-only). (b) Add a hook or event point in the CLI (e.g. "after session close" could call an optional action). Prefer (a) if the codebase remains CLI-only; (b) if we want one concrete hook.

**Where:** trace-spec/ (design or codex note) and/or [src/commands/session-close.ts](../../src/commands/session-close.ts) (optional post-close hook). Keep scope minimal.

**Done when:** Either a design note exists for scheduled/event-based actions, or one event-based hook (e.g. post session close) is implemented and documented. No full cron/scheduler required.

---

## Dependencies

- M3 (digest): Actions already appear in digest; no new dependency.

## Optional follow-up

- Full scheduler (cron or daemon) for scheduled actions.
- iOS/Background: action trigger UI and file-based job handling.
