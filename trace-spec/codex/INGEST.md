# INGEST

Defines session creation and media capture.

## Session creation

When a new session is created, the system MUST:

- Generate a new session id (ULID).
- Create a session directory.
- Write session.json with required fields:
  - id
  - created_at
  - updated_at
  - status ("active")
  - start_time (absolute RFC 3339)
  - title (optional, may be empty)
  - timeline_path ("timeline.jsonl")
  - markers_path ("markers.jsonl")
  - transcript_path (null)
  - voice_notes_path (null)
  - digest_path (null)
  - media (empty array)
- Create timeline.jsonl with a single session_start entry at offset_ms = 0.
- Create an empty markers.jsonl file.
- Create a media/ directory (may be empty).

## Media capture

When media is captured or ingested, the system MUST:

- Store the file under media/ using the media id as the basename.
- Record a media entry in session.json.media with:
  - id
  - kind ("audio", "video", "screen", or "other")
  - path (relative to the session directory)
  - mime (RFC 2046 type)
  - created_at
  - start_offset_ms
  - duration_ms (if known)

If no media is captured, the session remains valid with an empty media array.

## Session close

When a session is closed, the system MUST:

- Set session.json.status to "closed".
- Set end_time and duration_ms.
- Append a session_end entry to timeline.jsonl with the end offset.

## Timeline entries (ingest-owned)

Ingest is responsible for writing these timeline kinds:

- session_start (required)
- session_end (required on close)
- media_start (optional, when capture begins)
- media_end (optional, when capture ends)

Each timeline entry MUST include:

- id (ULID)
- kind (one of the above)
- offset_ms
- wall_time (absolute RFC 3339)
- created_at
- source ("system" or "user")
