# TRACE — Build roadmap

Build priorities and implementation areas for TRACE.

## 1. OBS-side capture support — Done

- Session creation tied to recording start/stop. — Done
- Reliable local recording.
- Review-audio generation. — Done

## 2. MIDI marker input — Done

- Single MIDI input listener. — Done
- Fixed CC → category mapping. — Done
- Timestamped marker writing. — Done

## 3. iOS app (core)

- Audio playback for review files. — Done
- Homescreen widget for markers. — Done
- Tap-to-toggle voice note recording.
- Offline-safe upload queue.
- Digest view.
- Action trigger UI.

## 4. Background processing — Done

- Local speech-to-text for voice notes. — Done (voice-note set-transcript; transcribe_voice_note job stub).
- File-based job handling. — Done
- Low-priority execution. — Done (docs: run with nice).

## 5. Digest system — Done

- Reads timeline + transcripts. — Done
- Generates and updates a structured summary. — Done
- Logs actions and outcomes. — Done

## 6. Action framework (extensible) — Done

- Explicit, user-triggered actions. — Done
- Optional scheduled/event-based actions. — Done (design note; out of scope for CLI).
- Draft-only outputs. — Done
- No publishing. — Done
