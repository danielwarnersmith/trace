# Plan: M1 To-do 4 — Review-audio generation and ingest

**Status:** Implemented

**Goal:** After recording stops (or when the primary recording file is available), derive an audio-only file from the OBS recording and ingest it as a media item in the session. Session must have at least one entry in session.json.media with kind "audio" pointing to a derived file under media/.

**Spec/codex:** [trace-spec/codex/INGEST.md](../codex/INGEST.md) (Media capture). [trace-spec/SPEC.md](../SPEC.md) Stage 1 — "Stores the original recording file (video + audio) and a derived audio-only review file."

**Steps:**

1. Add CLI command `trace media add-review-audio <dir> --source <path>` that derives audio from the source file (e.g. OBS recording) and ingests it into the session.
2. Use ffmpeg to extract audio from source (e.g. `ffmpeg -i source -vn -acodec copy output.m4a` or aac). Write to a temp file, then call existing `addMedia(sessionDir, { filePath, kind: 'audio', mime: 'audio/mp4', start_offset_ms: 0, duration_ms? })` so the file is copied to media/ and session.json.media is updated per INGEST.
3. Obtain duration_ms from ffmpeg probe or output when possible; otherwise omit (optional per INGEST).
4. Document ffmpeg as a dependency for this command (e.g. in README or docs/obs-setup.md).

**Where:** [src/commands/media.ts](../../src/commands/media.ts) — add `addReviewAudio(sessionDir, sourcePath)` or equivalent; [src/cli.ts](../../src/cli.ts) — add `media add-review-audio` branch and usage.

**Acceptance:** For a session dir, running `trace media add-review-audio <dir> --source <video-or-audio-file>` produces a file under session media/ and an entry in session.json.media with kind "audio", path, mime (e.g. audio/mp4), created_at, start_offset_ms 0, duration_ms if known. `trace validate <dir>` passes. File is playable.

**Agent:** Implement in repo; run npm run build, npm test, and trace validate after.
