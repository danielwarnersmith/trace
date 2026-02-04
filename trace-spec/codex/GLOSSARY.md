# Glossary

Session — One live performance and its associated data files.

Session clock — The relative time base for a session, measured in ms from
session start (offset_ms).

Timeline — The ordered list of time anchors and session events in
timeline.jsonl.

Marker — A user- or system-created annotation tied to a session time offset.

Voice note — A spoken annotation captured during a session, referenced by
markers and stored as metadata in voice_notes.jsonl and media/.

Transcript segment — A contiguous span of speech-to-text aligned to the session
clock.

Digest — A living human-readable summary of the session in digest.md.

Action — A user-invoked automation macro recorded in actions.jsonl.

Ingest — Session creation and media capture.

Transcribe — Speech-to-text processing of captured audio.

Mark — Creation and management of markers and voice notes.
