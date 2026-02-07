# Plan: M3 To-dos 3 & 4 — CLI digest generate and actions section

**Goal:** Add `trace digest generate <dir>` that runs readDigestInput → generateDigestContent → writeDigest; extend digest input to include actions.jsonl and generator to add a "Recent actions" section so action outcomes are visible in the digest.

**Spec/codex:** [trace-spec/codex/DIGEST.md](../codex/DIGEST.md); [trace-spec/codex/ACTIONS.md](../codex/ACTIONS.md); [milestone-03-digest-system-enhancement.md](../milestones/milestone-03-digest-system-enhancement.md) to-dos 3 and 4.

**Steps:**

1. **To-do 3:** Add CLI command `trace digest generate <dir>`. Validate session dir; call readDigestInput(sessionDir), generateDigestContent(input), writeDigest(sessionDir, content). Reuse writeDigest from digest.ts. Output: "digest: updated". Update usage string in cli.ts.
2. **To-do 4:** Extend digest input: read actions.jsonl from session dir (path sessionDir/actions.jsonl); if missing or empty, actions = []. Add DigestActionRun type (id, action, created_at, status; optional error). Extend generateDigestContent: add "## Recent actions" section listing id, action, status, created_at (last N, e.g. 20); if no actions, section says "No actions yet."

**Where:** [src/cli.ts](../../src/cli.ts) (digest generate block); [src/digest/types.ts](../../src/digest/types.ts) (DigestActionRun, actions on DigestInput); [src/digest/read-input.ts](../../src/digest/read-input.ts) (read actions.jsonl); [src/digest/generate.ts](../../src/digest/generate.ts) (Recent actions section).

**Acceptance:** `trace digest generate <dir>` produces digest.md and updates session.json. `trace digest read <dir>` returns generated content. Generated digest includes Recent actions from actions.jsonl when present; "No actions yet." when empty or missing. Build and tests pass.

**Agent:** Implement in repo; run npm run build, npm test.

**Implemented:** Branch feature/m03-digest-generate-cli. CLI `trace digest generate <dir>`; readDigestInput includes actions.jsonl (last 20); generateDigestContent adds Recent actions section; DigestActionRun type. test/cli.test.ts: cli digest generate produces digest from session data. Build and 33 tests pass.
