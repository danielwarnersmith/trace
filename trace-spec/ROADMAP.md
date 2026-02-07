# TRACE — Build roadmap

Build priorities and implementation areas for TRACE.

## 1. OBS-side capture support

- Session creation tied to recording start/stop.
- Reliable local recording.
- Review-audio generation.

## 2. MIDI marker input

- Single MIDI input listener.
- Fixed CC → category mapping.
- Timestamped marker writing.

## 3. iOS app (core)

- Audio playback for review files.
- Homescreen widget for markers.
- Tap-to-toggle voice note recording.
- Offline-safe upload queue.
- Digest view.
- Action trigger UI.

## 4. Background processing

- Local speech-to-text for voice notes.
- File-based job handling.
- Low-priority execution.

## 5. Digest system

- Reads timeline + transcripts.
- Generates and updates a structured summary.
- Logs actions and outcomes.

## 6. Action framework (extensible)

- Explicit, user-triggered actions.
- Optional scheduled/event-based actions.
- Draft-only outputs.
- No publishing.
