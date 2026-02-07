# Milestone 3: Digest system enhancement

**Goal:** Generate the digest from timeline and transcripts (and markers/voice notes), and ensure actions and outcomes are reflected so the product flow (Stage 4: Digest and Actions) has a living, structured summary.

**Spec/codex references:**

- [trace-spec/SPEC.md](../SPEC.md) — Overview, Stage 4: Digest and Actions ("Maintains the digest as a living, append-only document"; "records the action and its result in the digest").
- [trace-spec/codex/DIGEST.md](../codex/DIGEST.md) — Digest file (digest.md, UTF-8 Markdown, free-form); writes (overwrite digest.md, set digest_path, digest_updated_at, updated_at). Manual edits are authoritative.
- [trace-spec/codex/ACTIONS.md](../codex/ACTIONS.md) — Action runs logged to actions.jsonl (id, action, created_at, status; optional inputs, outputs, error).
- [trace-spec/schemas/session.schema.json](../schemas/session.schema.json) — session.json (digest_path, digest_updated_at).

**Existing implementation:**

- CLI: `trace digest write <dir> --file <path>` (writes content from file to digest.md), `trace digest read <dir>` in [src/commands/digest.ts](../../src/commands/digest.ts). writeDigest(sessionDir, content) overwrites digest.md and updates session.json per DIGEST. Action runs: [src/commands/action-run.ts](../../src/commands/action-run.ts) logs to actions.jsonl.

---

## To-dos

### 1. Read timeline and transcripts (and markers) for digest input — Done

**Read:** [trace-spec/SPEC.md](../SPEC.md) Stage 4 — "Reads the session data"; ROADMAP "Reads timeline + transcripts." [trace-spec/codex/DIGEST.md](../codex/DIGEST.md).

**Implement:** A function or step that, given a session directory, reads timeline.jsonl, transcript.jsonl (if present), markers.jsonl, and optionally voice_notes.jsonl and session.json. Output: structured data (e.g. list of timeline entries with offset_ms and kind; list of transcript segments with offset_ms, duration_ms, text; list of markers with offset_ms and label/tags) suitable for generating digest content. Handle missing optional files (transcript, voice_notes) without failing. Use existing paths: timeline_path, markers_path, transcript_path, voice_notes_path from session.json.

**Where:** New module under `src/` (e.g. `src/digest/` or `src/commands/digest.ts` extended) that reads these files and returns a digest input shape. No change to digest.md format yet; this is the data-gathering step.

**Done when:** Given a session dir, the code returns a single structure containing timeline entries, transcript segments (if any), markers, and optionally voice note summaries (e.g. offset, text). Validation: run against [trace-spec/fixtures](../fixtures) or a test session; all existing JSONL files are read and parsed.

*Implemented: src/digest/read-input.ts (readDigestInput); types in types.ts; uses session paths; missing optional files => [].*

---

### 2. Generate structured digest content from timeline + transcripts + markers — Done

**Read:** [trace-spec/SPEC.md](../SPEC.md) Stage 4 — "short, structured summary: session info, counts of markers, notable moments with timestamps, excerpts from voice notes." [trace-spec/codex/DIGEST.md](../codex/DIGEST.md) — format is free-form Markdown; system MUST NOT require a rigid template.

**Implement:** A function that, given the digest input (to-do 1), produces Markdown content for digest.md. Content MUST include at least: session info (id, start_time, duration if closed), count of markers, notable moments (e.g. markers with offset_ms and label/tags, optionally transcript excerpts at those offsets). Optionally: excerpts from voice notes (transcript_text or placeholder). Keep format free-form and human-readable; avoid a rigid schema so manual edits remain valid. Output is a string (Markdown); caller will pass it to writeDigest(sessionDir, content).

**Where:** Same module as to-do 1 (e.g. `src/digest/generate.ts` or extended digest command). Use existing writeDigest from [src/commands/digest.ts](../../src/commands/digest.ts) to write the result.

**Done when:** Given a session with timeline, markers, and (optionally) transcript, the generated digest.md contains session info, marker count, and at least one "notable moment" (marker with timestamp). Manual edits to digest.md remain allowed (DIGEST: "If a user edits digest.md manually, those edits are authoritative"); generation can overwrite, but the spec does not require merge—document that re-running generation overwrites, or add a "generate and append" mode later.

*Implemented: src/digest/generate.ts (generateDigestContent); session info, marker count, Notable moments section; free-form Markdown.*

---

### 3. Wire digest generation to CLI (optional command)

**Read:** [trace-spec/codex/DIGEST.md](../codex/DIGEST.md) — "When the system writes or updates the digest, it MUST: Overwrite digest.md ... Set session.json.digest_path ... digest_updated_at ... updated_at."

**Implement:** A CLI command or mode that runs digest generation (to-dos 1–2) and then writeDigest(sessionDir, content). E.g. `trace digest generate <dir>` (no --file; content is generated from session data). Reuse writeDigest so session.json is updated per DIGEST.

**Where:** [src/cli.ts](../../src/cli.ts) and [src/commands/digest.ts](../../src/commands/digest.ts). Add a new subcommand or flag (e.g. `trace digest generate <dir>` vs `trace digest write <dir> --file <path>`).

**Done when:** Running `trace digest generate <dir>` produces digest.md from timeline + transcripts + markers and updates session.json.digest_path and digest_updated_at. `trace digest read <dir>` returns the generated content.

---

### 4. Log actions and outcomes in digest (or link actions.jsonl to digest)

**Read:** [trace-spec/SPEC.md](../SPEC.md) Stage 4 — "When an action is triggered: ... records the action and its result in the digest." [trace-spec/codex/ACTIONS.md](../codex/ACTIONS.md) — action runs in actions.jsonl.

**Implement:** Ensure action outcomes are visible in the digest. Options: (a) When generating digest content (to-do 2), append a section "Recent actions" by reading actions.jsonl (last N runs) and listing action id, action, status, created_at, and optionally error or outputs summary; (b) Or when an action is run (action-run.ts), append a line or block to digest.md (e.g. "Action X ran at Y: status Z"). Prefer (a) so digest generation is the single place that assembles digest content; action-run already logs to actions.jsonl. Generate digest content to include an "Actions" section sourced from actions.jsonl when present.

**Where:** Digest generation (to-do 2) extended to read actions.jsonl and add an "Actions" or "Recent actions" section to the generated Markdown. [src/commands/action-run.ts](../../src/commands/action-run.ts) unchanged (already writes to actions.jsonl).

**Done when:** Generated digest.md includes a section that lists recent action runs (id, action, status, created_at) from actions.jsonl. If actions.jsonl is missing or empty, the section is omitted or says "No actions yet."

---

## Dependencies

- None (session, timeline, markers, transcript, actions already exist in CLI and spec).

## Optional follow-up

- "Append-only" digest: instead of overwriting, append new sections and keep manual edits (requires merge or append policy; spec says "living, append-only" but also "overwrite digest.md" in DIGEST—clarify with spec-auditor if needed).
- Integrate digest generation into a scheduled or event-based pipeline (see ROADMAP action framework).
