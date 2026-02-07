# Background jobs

Jobs are file-based: pending jobs live in `jobs/pending.jsonl` under the session directory. Use `trc jobs add` to enqueue a job and `trc jobs process` to run them.

## Commands

- **`trc jobs add <dir> <type> [--voice-note-id <id>]`** — Append a job. Supported type: `transcribe_voice_note` (requires `--voice-note-id`). Job id is printed.
- **`trc jobs process <dir> [--once]`** — Process pending jobs. Without `--once`, processes all pending jobs; with `--once`, processes one job. Processed jobs are moved to `jobs/completed.jsonl`.

## Job types

- **transcribe_voice_note** — Updates the voice note's `transcript_text` in `voice_notes.jsonl`. Current implementation is a stub (sets `[transcribed]`); plug in a local STT (e.g. Whisper) to fill transcript from audio.

## Low-priority execution

Run the processor with lower OS priority so it does not block interactive work. On Unix/macOS:

```bash
nice trc jobs process <dir>
```

Or process one job at a time with low priority:

```bash
nice trc jobs process <dir> --once
```

You can run this in a loop or from cron; with `--once` each invocation processes a single job.
