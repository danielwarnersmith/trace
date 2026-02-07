# Milestone 5: Background processing

**Goal:** Local speech-to-text for voice notes (update path + optional STT hook), file-based job handling, and low-priority execution so background work can run without blocking.

**Spec/codex references:**

- [trace-spec/ROADMAP.md](../ROADMAP.md) — §4 Background processing: Local speech-to-text for voice notes, file-based job handling, low-priority execution.
- [trace-spec/SPEC.md](../SPEC.md) — Stage 3: "Automatically transcribes voice notes later (locally, on the Mac)." Voice notes stored as original audio and text transcript (when available).
- [trace-spec/codex/TRANSCRIBE.md](../codex/TRANSCRIBE.md) — Transcript outputs. Voice note schema has optional transcript_text.

**Existing implementation:**

- Voice notes: [src/commands/mark.ts](../../src/commands/mark.ts) addVoiceNote writes to voice_notes.jsonl with optional transcript_text. No command to update transcript_text after the fact.
- Transcribe: [src/commands/transcribe.ts](../../src/commands/transcribe.ts) writes transcript.jsonl (session-level); no per–voice-note transcription.

---

## To-dos

### 1. Voice note transcript update path — Done

**Read:** SPEC Stage 3 — "Automatically transcribes voice notes later (locally, on the Mac)." Voice note schema: transcript_text optional.

**Implement:** A way to set or update a voice note's transcript_text after the voice note exists. E.g. `trace voice-note set-transcript <dir> <voice-note-id> --text "..."` or `--file <path>`. Reads voice_notes.jsonl, finds the entry by id, updates transcript_text, rewrites voice_notes.jsonl (or in-place update). Enables a local STT step (external tool or future integration) to write results back.

**Where:** New function in [src/commands/mark.ts](../../src/commands/mark.ts) or new [src/commands/voice-note-transcript.ts](../../src/commands/); CLI in [src/cli.ts](../../src/cli.ts).

**Done when:** Running the command updates the voice note's transcript_text in voice_notes.jsonl. Validation (trace validate) still passes. Build and tests pass.

*Implemented: updateVoiceNoteTranscript in mark.ts; CLI voice-note set-transcript <dir> <voice-note-id> (--text | --file).*

---

### 2. File-based job handling — Done

**Read:** ROADMAP — "File-based job handling."

**Implement:** A job queue represented as files (e.g. session dir `jobs/pending.jsonl` or repo-level). Job shape: id (ULID), type (string), payload (object), created_at, status ("pending" | "running" | "completed" | "failed"). At least one job type: `transcribe_voice_note` with payload `{ voice_note_id }`. A command `trace jobs process <dir> [--once]` (or `trace process-jobs <dir>`) reads pending jobs, runs each (e.g. for transcribe_voice_note: call STT for that voice note's media and update transcript via to-do 1, or stub by setting transcript_text from a placeholder), then moves job to completed/failed. If no STT integration yet, the handler can set transcript_text to a placeholder or run an external command. Create job: e.g. `trace jobs add <dir> transcribe_voice_note --voice-note-id <id>` appends a job to pending.

**Where:** New `src/jobs/` or `src/commands/jobs.ts`; CLI subcommands. Session dir: `jobs/pending.jsonl` and `jobs/completed.jsonl` (or single jobs.jsonl with status).

**Done when:** Adding a job and running process executes the handler (stub or real). Jobs are file-based; process command exists. Build and tests pass.

---

### 3. Low-priority execution

**Read:** ROADMAP — "Low-priority execution."

**Implement:** When running the job processor, run with lower OS priority so it does not block interactive work. Options: (a) Document that users should run `nice trace jobs process <dir>` (or equivalent). (b) Add a flag or default so the process runs with lower priority (e.g. on Unix spawn a child with nice, or set process priority in Node if available). Prefer (b) if straightforward (e.g. child_process.spawn with nice on Unix); otherwise (a) plus one-line in docs.

**Where:** [src/commands/jobs.ts](../../src/commands/) processor entry point, or docs. [docs/background-jobs.md](../../docs/background-jobs.md) or README.

**Done when:** Documented and/or implemented: job processor runs with lower priority (e.g. nice on Unix). Build and tests pass.

*Implemented: docs/background-jobs.md — run with nice trc jobs process <dir>.*

---

## Dependencies

- None (voice notes, session dir, transcribe codex already exist).

## Optional follow-up

- Integrate a local STT (e.g. Whisper CLI or Node binding) in the transcribe_voice_note job handler.
- Cron or daemon to run `trace jobs process` periodically.
