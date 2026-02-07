# Plan: M1 To-do 1 & 2 — OBS session lifecycle

**Goal:** When OBS starts recording, create a TRACE session; when OBS stops, close that session. No manual `trace session init`/`trace session close` required for the OBS flow.

**Spec/codex:** [trace-spec/codex/INGEST.md](../../codex/INGEST.md) (Session creation, Session close). [trace-spec/SPEC.md](../../SPEC.md) Stage 1: Capture.

**Steps:**

1. Add OBS Lua script that registers for recording start/stop events.
2. On recording start: build session path (configurable base dir + timestamp), run `trace session init <path>`, write path to state file (~/.trace/obs-active-session.txt).
3. On recording stop: read path from state file, run `trace session close <path>`, remove state file.
4. Document in integrations/obs/README.md how to install script in OBS and set session base dir; require trace CLI in PATH.

**Where:** `integrations/obs/` — Lua script(s) and README. State file: `~/.trace/obs-active-session.txt`.

**Acceptance:** OBS start → session dir appears with session.json, timeline.jsonl (session_start at 0), markers.jsonl, media/. OBS stop → session.json status "closed", end_time/duration_ms set, timeline.jsonl has session_end. `trace validate <dir>` passes.

**Status:** Implemented. integrations/obs/trace-obs-session.lua, integrations/obs/README.md, docs/obs-setup.md. Tests pass.
