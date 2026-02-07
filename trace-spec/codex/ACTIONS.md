# ACTIONS

Defines optional automation macros.

## Principles

- Actions are always user-invoked. There is no automatic background execution.
- Actions MUST be optional; the system may ship with zero built-in actions.

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
