# ACTIONS

Defines optional automation macros.

## Principles

- Actions are always user-invoked. There is no automatic background execution.
- Actions MUST be optional; the system may ship with zero built-in actions.
- **Draft-only outputs:** Action results MUST be written only to the session directory or a user-designated path. There is no auto-publishing (no upload, push, or side channel). The framework does not publish; handlers must not publish.

## Action runs

If actions are implemented, the system MUST log each run to actions.jsonl.
Each line is a JSON object representing one run.

Each action run MUST include:

- id (ULID)
- action (string identifier)
- created_at
- status ("started", "succeeded", or "failed")

Optional fields:

- inputs (object)
- outputs (object)
- error (string)

If actions.jsonl does not exist, it MUST be created on the first run.

Entries are ordered by append order; created_at is non-decreasing in normal
operation.
