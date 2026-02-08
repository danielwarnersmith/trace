# Plan: M6 To-do 4 — Offline-safe upload queue (implemented)

**Goal:** Implement M6 to-do 4: upload queue that holds pending markers and voice notes; persist locally; drain to session when session is reachable. No data loss when app is killed before upload.

**Spec:** [milestone-06-ios-app-core.md](../milestones/milestone-06-ios-app-core.md) to-do 4; [trace-spec/design/ios-app.md](../design/ios-app.md).

**Implemented:** Branch feature/m06-todo4-offline-upload-queue.

- **PendingMarkers** — Queue in App Group UserDefaults (tag, offset_ms, created_at). add(tag, offsetMs); flush(sessionRoot) appends each via appendMarker and clears written. Persists across app kill.
- **TraceApp.handleAddMarkerURL** — When no session root: PendingMarkers.add(tag, currentOffsetMs). When session root: try appendMarker; on error, PendingMarkers.add for retry.
- **ContentView.loadSessionAndPlayback** — After loading session, call PendingMarkers.flush(root) and PendingVoiceNotes.flush(root) so queued markers and voice notes are written.
- **PendingVoiceNotes** (to-do 3) — Already persisted in App Group + Documents/pending_voice_notes; flush on session load. Survives app kill.

CLI build and 35 tests pass.
