# TRANSCRIBE

Defines speech-to-text behavior.

## Inputs

- A session with at least one media item of kind "audio" or "video".
- The session clock and timeline provide the time base for alignment.

If no suitable media exists, transcription MUST fail with a clear error.

## Outputs

When transcription runs, the system MUST:

- Write transcript.jsonl as a JSONL list of transcript segments.
- Set session.json.transcript_path to "transcript.jsonl".
- Set session.json.transcribed_at (RFC 3339).
- Update session.json.updated_at.

Each transcript segment MUST include:

- id (ULID)
- offset_ms
- duration_ms
- text

Optional fields:

- speaker (string)
- confidence (number between 0 and 1)

Segments MUST be ordered by offset_ms. Overlaps are allowed but MUST be explicit
in the offsets.

## Re-runs

Re-running transcription MUST overwrite transcript.jsonl and update
transcribed_at. The system MAY keep backups, but only the latest file is
authoritative.
