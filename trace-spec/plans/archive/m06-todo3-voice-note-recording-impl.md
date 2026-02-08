# Plan: M6 To-do 3 — Tap-to-toggle voice note recording (implemented)

**Goal:** Implement M6 to-do 3: Voice Note button that starts recording on first tap (offset_ms = current playback at tap) and stops on second tap; save recording, create voice note entry, write to session or queue for upload.

**Spec:** [milestone-06-ios-app-core.md](../milestones/milestone-06-ios-app-core.md) to-do 3; [trace-spec/schemas/voice_note.schema.json](../schemas/voice_note.schema.json).

**Implemented:** Branch feature/m06-todo3-voice-note-recording.

- **RecordingService** — AVAudioRecorder, startRecording(offsetMs:) / stopRecording() returns (offsetMs, durationMs, fileURL). Records to temp .m4a; .playAndRecord category.
- **VoiceNoteWriter** — VoiceNotePayload; appendVoiceNote(sessionRoot:payload:audioSourceURL:) copies audio to session media/, appends to voice_notes.jsonl, updates session.json (updated_at, voice_notes_path).
- **PendingVoiceNotes** — Queue in App Group UserDefaults; pending audio files in Documents/pending_voice_notes/. add(payload, audioSourceURL); flush(sessionRoot) writes all to session and clears.
- **ContentView** — Voice Note button in playback view; tap to start (capture currentOffsetMs), tap to stop; create payload, write to session if root available else enqueue; on load try flush pending. NSMicrophoneUsageDescription in Info.plist.

CLI build and 35 tests pass.
