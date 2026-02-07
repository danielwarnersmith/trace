# Actions

Actions are optional automation macros invoked via `trc action run <dir> <action-id> [--input key=value ...]`. Runs are logged to `actions.jsonl` in the session directory. See [trace-spec/codex/ACTIONS.md](../trace-spec/codex/ACTIONS.md) for the codex.

## Adding actions

Actions are registered in code. The CLI uses a registry in `src/commands/action-run.ts`:

- **`registerAction(actionId: string, handler: ActionHandler): void** — Registers a handler for an action id. Call this before any code path that can run `runAction` (e.g. at app startup).
- **`ActionHandler`** — `(sessionDir: string, inputs: Record<string, string>) => Promise<{ outputs?: Record<string, unknown> }>`. The handler receives the resolved session directory and parsed `--input key=value` pairs; it may return optional `outputs` to be stored in the action run entry.

To add a new action:

1. Implement a function that matches `ActionHandler`: accept `sessionDir` and `inputs`, perform the work (reading/writing only under `sessionDir` or user-designated paths), and return `{ outputs }` if needed.
2. Call `registerAction('your.action.id', yourHandler)` from a module that is loaded before the CLI runs actions (e.g. from `src/cli.ts` or a dedicated actions bootstrap module that cli imports).

The system may ship with zero built-in actions; the registry starts empty. Unknown action ids result in a failed run and an error logged to actions.jsonl.
