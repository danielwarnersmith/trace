# Plan: M2 To-dos 3 & 4 — Session time and write marker on CC

**Goal:** When a valid (mapped) CC is received during `trc midi listen`, compute current session offset_ms and append a marker to markers.jsonl with that offset and the category as tag. Session is the dir passed to the command; current time = now - session start_time.

**Spec/codex:** [trace-spec/INGEST.md](../codex/INGEST.md) — session has start_time; [trace-spec/SPEC.md](../SPEC.md) — "Markers are timestamped relative to the start of the recording." [trace-spec/codex/MARK.md](../codex/MARK.md) — append to markers.jsonl, update session.json.updated_at. [milestone-02-midi-marker-input.md](../milestones/milestone-02-midi-marker-input.md) to-dos 3 and 4.

**Steps:**

1. **To-do 3:** In the midi listen flow we already have sessionDir and session (from session.json). Use session.start_time (RFC 3339). On each mapped CC, compute offset_ms = Date.now() - new Date(session.start_time).getTime() (ms since session start). Assume continuous recording (no pause handling).
2. **To-do 4:** When category is non-null (mapped CC), call addMarker(sessionDir, { offset_ms, tags: [category] }). Reuse addMarker from [src/commands/mark.ts](../../src/commands/mark.ts). Marker will have source "user", created_at now, id ULID. Do not write a marker for unmapped CCs (only log).
3. Log marker id to stderr after writing (e.g. "marker: <id>") and continue logging the CC line (channel, controller, value, category). On addMarker error, log error and do not exit (keep listening).

**Where:** [src/cli.ts](../../src/cli.ts) midi listen block: in onCC, compute offset_ms from session.start_time, get category; if category, await addMarker(sessionDir, { offset_ms, tags: [category] }).

**Acceptance:** When a mapped CC is received during `trc midi listen <dir>`, markers.jsonl gets a new line with id, offset_ms (relative to session start), created_at, source "user", tags: [category]; session.json.updated_at is updated. `trace validate <dir>` passes; `trace markers list <dir>` shows the new marker. Unmapped CCs are still logged but do not create markers.

**Agent:** Implement in repo; run npm run build, npm test; manual test with MIDI device.

**Implemented:** Branch feature/m02-midi-marker-write. CLI midi listen: require session.start_time; on mapped CC compute offset_ms = Date.now() - new Date(startTime).getTime(), call addMarker(sessionDir, { offset_ms, tags: [category] }), log marker id or error. Build and tests pass.
