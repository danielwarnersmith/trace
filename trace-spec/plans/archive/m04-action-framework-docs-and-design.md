# Plan: M4 To-dos 1–3 — Action registry docs, draft-only outputs, scheduled-actions design

**Goal:** (1) Document how to add actions (current registerAction code path). (2) Add draft-only / no-publishing principle to ACTIONS.md. (3) Add a short design note for scheduled/event-based actions (out of scope for CLI-only).

**Spec/codex:** [trace-spec/codex/ACTIONS.md](../codex/ACTIONS.md); [milestone-04-action-framework.md](../milestones/milestone-04-action-framework.md) to-dos 1, 2, 3.

**Steps:**

1. **To-do 1:** Add "Adding actions" documentation. Describe: actions are registered in code via `registerAction(actionId, handler)` from `src/commands/action-run.ts`; handler receives (sessionDir, inputs) and returns optional outputs; any module that runs before `runAction` (e.g. imported by cli.ts) can call registerAction. Add to README or new docs/actions.md. No config file or plugin dir required for this deliverable; doc is sufficient.
2. **To-do 2:** In ACTIONS.md add a "Draft-only outputs" (or "Outputs") section: action results MUST be written only to the session directory or a user-designated path; no auto-publishing (no upload, push, or side channel). Existing runAction behavior already complies (handlers receive sessionDir; no publishing in framework).
3. **To-do 3:** Add a design note for scheduled/event-based actions. Create trace-spec/design/scheduled-actions.md (or equivalent) stating: scheduled/event-based triggers (e.g. after session close, cron) are out of scope for the current CLI; when implemented, they would invoke the same runAction(sessionDir, actionId, inputs) contract. Optionally note one possible hook: "after session close" could call an optional action (future).

**Where:** README.md or docs/actions.md; trace-spec/codex/ACTIONS.md; trace-spec/design/scheduled-actions.md (create design dir if needed).

**Acceptance:** README or docs explain how to add an action; ACTIONS.md states draft-only, no publishing; design note exists for scheduled/event-based actions. Build and tests unchanged (no code changes required for 1–2 if doc-only; optional small code tweaks).

**Agent:** Implement in repo; run npm run build, npm test.

**Implemented:** Branch feature/m04-action-framework-docs. docs/actions.md (Adding actions: registerAction, ActionHandler, where to call); ACTIONS.md principle "Draft-only outputs"; trace-spec/design/scheduled-actions.md (design note, same runAction contract, future hooks); README link to docs/actions.md. Build and 33 tests pass.
