# Plan: M2 To-do 1 — MIDI input listener

**Status:** Implemented

**Goal:** A process or module that listens for MIDI CC (Control Change) input on a configurable channel/port. Runs during an active session (session dir with status "active"). No marker writing yet; only receive and pass CC events (channel, CC number, value) to the next layer.

**Spec/codex:** [trace-spec/SPEC.md](../SPEC.md) Stage 2 — "Listens for MIDI input during the session"; "When a valid CC is received, TRACE writes a marker event." [milestone-02-midi-marker-input.md](../milestones/milestone-02-midi-marker-input.md) to-do 1.

**Steps:**

1. Add a Node MIDI dependency that supports CC on macOS (e.g. `midi` or `easymidi`). Prefer one that works on macOS CoreMIDI and optionally Windows.
2. Create a module under `src/midi/` (e.g. `src/midi/listener.ts`) that: lists available MIDI inputs; opens a configurable input port (by name or index); on CC message, receives (channel, controller number, value) and passes to a callback or event. No file writes; no marker logic.
3. Add CLI command `trace midi listen <session-dir>` that: optionally checks session exists and is active (session.json.status === "active"); starts the MIDI listener; logs or outputs received CC (channel, cc, value). Document that this is for Stage 2 signal input; marker writing is a later to-do.
4. Document in README or `docs/midi-setup.md`: how to run `trace midi listen <dir>`, OS/port requirements (macOS CoreMIDI; Windows MIDI API if supported), and that an active session is required for meaningful use (M1 OBS flow or manual session init).

**Where:** New `src/midi/listener.ts` (or `src/ingest/midi-listener.ts`); [src/cli.ts](../../src/cli.ts) for `midi listen`; optional `docs/midi-setup.md`.

**Acceptance:** When a MIDI CC is sent to the configured device/port, the listener receives it and can pass (channel, CC number, value) to the next layer (e.g. log to stdout or callback). Running `trace midi listen <session_dir>` starts the listener; optional unit test with mock MIDI source if feasible.

**Agent:** Implement in repo; run npm run build, npm test; manual test with hardware or virtual MIDI port.
