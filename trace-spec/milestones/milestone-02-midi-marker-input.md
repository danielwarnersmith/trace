# Milestone 2: MIDI marker input

**Goal:** Accept MIDI input during a session and write timestamped markers with a fixed category (Highlight, Structure, Texture/Sample, Fix/Review) so the product flow (Stage 2: Signal) is implementable.

**Spec/codex references:**

- [trace-spec/SPEC.md](../SPEC.md) — Overview, Stage 2: Signal (MIDI button/footswitch, TRACE writes marker with session time and fixed category).
- [trace-spec/codex/MARK.md](../codex/MARK.md) — Markers: required/optional fields, writes (append to markers.jsonl, update session.json.updated_at). Marker categories (Highlight, Structure, Texture/Sample, Fix/Review) may be represented as tags or label, or future category field.
- [trace-spec/schemas/marker.schema.json](../schemas/marker.schema.json) — marker shape (id, offset_ms, created_at, source; optional duration_ms, label, note, tags, voice_note_id).

**Existing implementation:**

- CLI: `trace mark <dir> --offset <ms> [--label <label>] [--note <text>] [--tag <tag> ...]` in [src/commands/mark.ts](../../src/commands/mark.ts). Markers are appended to markers.jsonl; session.json.updated_at is updated.

---

## To-dos

### 1. MIDI input listener

**Read:** [trace-spec/SPEC.md](../SPEC.md) Stage 2 — "Listens for MIDI input during the session"; "When a valid CC is received, TRACE writes a marker event."

**Implement:** A process or module that listens for MIDI input (e.g. Node with a MIDI library such as `midi` or `easymidi`, or a small native helper). Must receive MIDI CC (Control Change) messages on a configurable channel. Run during an "active" session (session dir with status "active"). No marker writing yet; only receive and log or pass CC events for the next task.

**Where:** New module under `src/` (e.g. `src/midi/` or `src/ingest/midi-listener.ts`) or a standalone script in `scripts/`. Document how to run it (e.g. `trace midi listen <session-dir>` or separate process). Document OS/port requirements (e.g. macOS CoreMIDI, Windows MIDI API).

**Done when:** When a MIDI CC is sent to the configured device/port, the listener receives it and can pass channel, CC number, and value to the next layer. Optional: unit test with a mock MIDI source.

---

### 2. Fixed CC → category mapping

**Read:** [trace-spec/SPEC.md](../SPEC.md) Stage 2 — "a fixed category: Highlight, Structure, Texture / Sample, Fix / Review"; [trace-spec/codex/MARK.md](../codex/MARK.md) — categories as tags or label.

**Implement:** A mapping from (MIDI channel, CC number, optionally value) to one of the four categories: Highlight, Structure, Texture/Sample, Fix/Review. Config must be editable (e.g. config file or env) so different hardware can map different CCs to categories. Output: category string (or tag) per MARK (use tags or label; schema has no category field yet). Example: CC 20 on channel 0 → "highlight"; CC 21 → "structure"; CC 22 → "texture-sample"; CC 23 → "fix-review". Document the default mapping and how to override.

**Where:** Config file (e.g. `trace-spec/midi-categories.json` or project root `.trace-midi.json`) or options in the MIDI listener module. No new schema field unless you add category to marker schema; use tag(s) or label for now per MARK.

**Done when:** Given a CC event, the system resolves a single category and can pass it to the marker writer (e.g. as a tag "highlight" or label "Highlight").

---

### 3. Resolve "current session" and current time for MIDI

**Read:** [trace-spec/codex/INGEST.md](../codex/INGEST.md) — session has start_time; timeline has offset_ms from session start. [trace-spec/SPEC.md](../SPEC.md) — "Markers are timestamped relative to the start of the recording."

**Implement:** During MIDI listener run, the system must know (a) which session directory is "active" (e.g. single active session path via env, config, or lock file), and (b) current session time in offset_ms. Current time = now - session start_time (from session.json.start_time). If the session is created when OBS starts (M1), start_time is set at session init; compute offset_ms = (Date.now() - new Date(session.start_time).getTime()) or equivalent. Handle clock skew and paused sessions if needed (out of scope for minimal: assume continuous recording).

**Where:** Same process as the MIDI listener; read session.json from the active session dir. If no active session, ignore MIDI or log warning.

**Done when:** When a valid CC is received, the process can compute current offset_ms for the active session and pass (offset_ms, category) to the marker writer.

---

### 4. Write marker on valid CC (append to markers.jsonl)

**Read:** [trace-spec/codex/MARK.md](../codex/MARK.md) — "When creating a marker or voice note, the system MUST append a new entry to the corresponding JSONL file and update session.json.updated_at." Marker: id (ULID), offset_ms, created_at, source ("user" or "system").

**Implement:** On valid CC (after mapping to category), create a marker object: id (new ULID), offset_ms (from to-do 3), created_at (RFC 3339 now), source "user". Add category as tag or label per MARK (e.g. tags: ["highlight"] or label: "Highlight"). Append one line to markers.jsonl; read session.json, set updated_at to now, write back. Reuse or call the same logic as `trace mark` (e.g. shared `addMarker(sessionDir, { offset_ms, ... })`) so schema and file layout stay consistent.

**Where:** [src/commands/mark.ts](../../src/commands/mark.ts) or shared module used by both CLI and MIDI listener. MIDI listener calls this after resolving category and offset_ms.

**Done when:** When a valid CC is received during an active session, markers.jsonl gets a new line with id, offset_ms, created_at, source "user", and category as tag/label; session.json.updated_at is updated. `trace validate <dir>` passes. `trace markers list <dir>` shows the new marker.

---

## Dependencies

- **M1 (optional):** "Active session" is clearer when OBS integration creates/closes sessions (M1). Without M1, active session can be "the most recently inited session" or a configured path.

## Optional follow-up

- Add optional `category` field to marker schema and codex MARK once product agrees on representation.
