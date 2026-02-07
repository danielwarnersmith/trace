# Scheduled and event-based actions (design note)

Scheduled or event-based triggers (e.g. "run action X every N minutes", "run action Y after session close") are **out of scope** for the current CLI-only implementation. This note describes how they would fit when implemented.

## Contract

When scheduled or event-based triggers are added, they MUST invoke the same contract as user-invoked actions: `runAction(sessionDir, actionId, inputs)`. No separate "scheduled action" type; the same actions run whether triggered by the user or by a schedule/event.

## Possible triggers (future)

- **After session close** — When `trace session close <dir>` completes, an optional hook could run one or more actions for that session (e.g. `digest.generate`). Requires a configured action id and possibly session dir.
- **Cron or timer** — A separate process or daemon could run on a schedule and call `runAction` for a designated session or set of sessions. Out of scope for the CLI binary itself.
- **File or external event** — A watcher could run actions when a file appears or an external event occurs. Same contract: `runAction(sessionDir, actionId, inputs)`.

## Current scope

The CLI does not implement any of the above. All actions are user-invoked via `trace action run <dir> <action-id>`. This design note is for future implementers.
