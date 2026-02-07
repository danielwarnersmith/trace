# TRACE iOS app

Lightweight iOS app (iPhone 15 Pro) for TRACE Stage 3 (Reflect) and Stage 4 (Digest and Actions). See [trace-spec/milestones/milestone-06-ios-app-core.md](../../trace-spec/milestones/milestone-06-ios-app-core.md) for the full milestone.

## To-dos (M6)

1. **Audio playback for review files** — Play the session's review audio; expose playback position (ms from start) for markers and voice notes.
2. **Homescreen widget for markers** — Widget with four category buttons; tap adds marker at current playback time.
3. **Tap-to-toggle voice note recording** — Start/stop recording; create voice note with offset_ms and duration_ms; queue upload.
4. **Offline-safe upload queue** — Persist pending markers and voice notes; drain to session when online.
5. **Digest view** — Display session digest.md (read-only).
6. **Action trigger UI** — Trigger actions; runs logged to actions.jsonl.

## Design

Session model, playback contract, and how the app gets session data: [trace-spec/design/ios-app.md](../../trace-spec/design/ios-app.md).

## Implementation

Add an Xcode project here (e.g. `Trace.xcodeproj`) or use a separate repo (e.g. `trace-ios`). Target iPhone 15 Pro; use SwiftUI and AVFoundation. Session data may be synced via a backend, file share, or local copy; see design doc.
