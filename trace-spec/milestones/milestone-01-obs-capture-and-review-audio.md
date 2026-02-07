# Milestone 1: OBS-side capture and review audio

**Goal:** Tie session lifecycle to OBS recording start/stop and add review-audio generation so the product flow (Stage 1: Capture) is implementable.

**Spec/codex references:**

- [trace-spec/SPEC.md](../SPEC.md) — Overview, Stage 1: Capture (what the user does, what TRACE does).
- [trace-spec/codex/INGEST.md](../codex/INGEST.md) — Session creation, media capture, session close, timeline entries.
- [trace-spec/schemas/session.schema.json](../schemas/session.schema.json) — session.json shape.
- [trace-spec/schemas/timeline.schema.json](../schemas/timeline.schema.json) — timeline entry shape.

**Existing implementation:**

- CLI: `trace session init <dir>`, `trace session close <dir>`, `trace media add <dir> ...` in [src/commands/session-init.ts](../../src/commands/session-init.ts), [session-close.ts](../../src/commands/session-close.ts), [media.ts](../../src/commands/media.ts). Session creation and media ingest already conform to INGEST.

---

## To-dos

### 1. OBS → session lifecycle: session creation on recording start

**Read:** [trace-spec/codex/INGEST.md](../codex/INGEST.md) (Session creation), [src/commands/session-init.ts](../../src/commands/session-init.ts).

**Implement:** A mechanism that runs when OBS *starts* recording and creates a new TRACE session for that recording. Options: (a) OBS script (Lua) or plugin that invokes `trace session init <dir>` with a configured output directory; (b) a small daemon/watchdog that detects OBS recording start (e.g. via OBS WebSocket or file-system watch on OBS output dir) and calls the existing session-init logic. Prefer reusing the existing CLI or its core (e.g. import `initSession` from a shared module) so session.json, timeline.jsonl, markers.jsonl, media/ are created per INGEST.

**Where:** New module or script under `src/` or a dedicated `scripts/` or `integrations/obs/` directory; document required OBS output path and how it is passed to `trace session init`.

**Done when:** When OBS starts recording (by whatever trigger is chosen), a session directory appears with session.json (id, created_at, updated_at, status "active", start_time, timeline_path, markers_path, etc.), timeline.jsonl with one session_start at offset_ms 0, empty markers.jsonl, and media/ directory. No manual `trace session init` required for the OBS flow.

---

### 2. OBS → session lifecycle: session close on recording stop

**Read:** [trace-spec/codex/INGEST.md](../codex/INGEST.md) (Session close), [src/commands/session-close.ts](../../src/commands/session-close.ts).

**Implement:** A mechanism that runs when OBS *stops* recording and closes the active TRACE session. Must set session.json.status to "closed", set end_time and duration_ms, and append a session_end entry to timeline.jsonl with the end offset (see INGEST). Use the same trigger approach as to-do 1 (OBS script, WebSocket, or file watch). Must resolve "the active session" (e.g. the session dir that was created on start, or a configured path).

**Where:** Same integration layer as to-do 1; reuse `closeSession` or equivalent.

**Done when:** When OBS stops recording, the session directory’s session.json has status "closed", end_time and duration_ms set, and timeline.jsonl ends with a session_end entry at the correct offset_ms. Validation (`trace validate <dir>`) passes.

---

### 3. Reliable local recording (OBS configuration)

**Read:** [trace-spec/SPEC.md](../SPEC.md) Overview, Stage 1 — "OBS is configured to stream and record locally at the same time."

**Implement:** Document the OBS setup required for TRACE: local recording path, format, and that recording must be reliable (e.g. same drive as TRACE session or fast enough to avoid drops). No code change in TRACE required; add a short doc (e.g. `docs/obs-setup.md` or a section in README) describing recommended OBS settings and output path that the integration (to-do 1/2) will use.

**Where:** New doc under `docs/` or section in project README.

**Done when:** A maintainer can follow the doc and have OBS writing a local recording that TRACE will use as the authoritative source for the session.

---

### 4. Review-audio generation and ingest

**Read:** [trace-spec/codex/INGEST.md](../codex/INGEST.md) (Media capture), [trace-spec/SPEC.md](../SPEC.md) Stage 1 — "Stores the original recording file (video + audio) and a derived audio-only review file."

**Implement:** After recording stops (or when the primary recording file is available), derive an audio-only file (e.g. from the OBS recording via ffmpeg) and ingest it as a media item in the session. INGEST: store file under media/ with a media id as basename, add an entry to session.json.media with id, kind "audio", path, mime, created_at, start_offset_ms, duration_ms (if known). The "review" file is the one intended for later listening (e.g. on iPhone); the original may be video+audio. Reuse or extend `trace media add` so the review-audio file is added with kind "audio" and correct path/mime.

**Where:** New script or step in the OBS integration (after session close) or a new CLI command (e.g. `trace media add-review-audio <dir> --source <path>`). If using ffmpeg, document it as a dependency.

**Done when:** For a session created from an OBS recording, session.json.media contains at least one entry with kind "audio" pointing to a derived audio-only file under media/, and that file exists and is playable. Original recording (video+audio) may also be ingested if desired; spec says "original recording file" and "derived audio-only review file" are both stored.

---

## Dependencies

- None (first milestone). Session init/close and media add already exist in CLI.

## Optional follow-up

- media_start / media_end timeline entries (INGEST) when capture begins/ends, if needed for product clarity.
