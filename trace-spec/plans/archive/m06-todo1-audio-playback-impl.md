# Plan: M6 To-do 1 — Audio playback for review files (implemented)

**Goal:** Implement M6 to-do 1 in the iOS app: play the session's review audio and expose playback position as offset_ms (ms from start) for use by markers and voice notes.

**Spec:** [milestone-06-ios-app-core.md](../milestones/milestone-06-ios-app-core.md) to-do 1; [trace-spec/design/ios-app.md](../design/ios-app.md) — session model, playback contract.

**Implemented:** Branch feature/m06-todo1-audio-playback.

- **Session.swift** — Session and MediaItem Codable from session.json; reviewMedia = first media with kind "audio" or "video"; reviewAudioURL(sessionRoot:) resolves path; loadSession(from:) loads session.json.
- **PlaybackService.swift** — @MainActor ObservableObject; load() sets AVAudioSession playback category, creates AVPlayer for review audio URL, addPeriodicTimeObserver (0.1s) publishes currentOffsetMs; play/pause/togglePlayPause/seek(toOffsetMs:); durationMs from asset when available.
- **ContentView.swift** — Open session folder via fileImporter(.folder); startAccessingSecurityScopedResource on selected URL; load Session and PlaybackService; playback UI: play/pause button, offset ms and duration ms, "Open another session".
- **.gitignore** — Added `**/xcuserdata/` so Xcode user state is not committed.
- **trace-spec/design/ios-app.md** — "Current scope" updated: Xcode project exists, to-do 1 implemented.

CLI build and 35 tests pass. iOS app builds in Xcode (Trace target); new Swift files are picked up by PBXFileSystemSynchronizedRootGroup.
