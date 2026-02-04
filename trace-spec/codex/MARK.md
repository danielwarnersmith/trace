# MARK

Defines annotation behavior.

## Markers

Markers are stored in markers.jsonl. Each line is a JSON object representing a
marker. If multiple entries share the same id, the last entry is authoritative.

Each marker MUST include:

- id (ULID)
- offset_ms
- created_at
- source ("user" or "system")

Optional fields:

- duration_ms
- label (short string)
- note (free-form text)
- tags (array of tag strings)
- voice_note_id (ULID)

## Voice notes

Voice notes are stored in voice_notes.jsonl. Each line is a JSON object
representing a voice note. If multiple entries share the same id, the last entry
is authoritative.

Each voice note MUST include:

- id (ULID)
- created_at
- media_path (relative path under media/)
- offset_ms
- duration_ms

Optional fields:

- transcript_text (string)
- marker_id (ULID)

## Writes

When creating a marker or voice note, the system MUST append a new entry to the
corresponding JSONL file and update session.json.updated_at.

The system MUST create voice_notes.jsonl on first write and set
session.json.voice_notes_path to "voice_notes.jsonl".
