# Plan: M5 Background processing (to-dos 1–3)

**Goal:** (1) Voice note transcript update path: command to set/update transcript_text. (2) File-based job handling: jobs/pending.jsonl, jobs add, jobs process with transcribe_voice_note handler (stub: set transcript_text placeholder). (3) Low-priority execution: document nice.

**Spec:** [milestone-05-background-processing.md](../milestones/milestone-05-background-processing.md); ROADMAP §4.

**Implemented:** Branch feature/m05-background-processing. To-do 1: updateVoiceNoteTranscript in mark.ts; CLI voice-note set-transcript <dir> <voice-note-id> (--text | --file). To-do 2: src/commands/jobs.ts (addJob, processJobs); jobs/pending.jsonl, jobs/completed.jsonl; CLI jobs add, jobs process; transcribe_voice_note handler stub sets [transcribed]. To-do 3: docs/background-jobs.md (run with nice). Tests: cli voice-note set-transcript, cli jobs add and jobs process. Build and 35 tests pass.
