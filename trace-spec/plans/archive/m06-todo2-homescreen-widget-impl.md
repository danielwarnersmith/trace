# Plan: M6 To-do 2 — Homescreen widget for markers (implemented)

**Goal:** Implement M6 to-do 2: homescreen widget with four marker-category buttons; tap opens app with add-marker URL; app writes marker (offset_ms, tag) to markers.jsonl and updates session.json.updated_at.

**Spec:** [milestone-06-ios-app-core.md](../milestones/milestone-06-ios-app-core.md) to-do 2; [trace-spec/codex/MARK.md](../codex/MARK.md).

**Implemented:** Branch feature/m06-todo2-homescreen-widget.

- **App Group** — group.dws.Trace; SharedState.swift (sessionRootBookmark, currentOffsetMs, setSessionRoot/clearSessionRoot, resolveSessionRoot).
- **URL scheme** — trace://add-marker?tag=highlight|structure|texture_sample|fix_review; Trace.entitlements, Info.plist (CFBundleURLTypes); TraceApp.handleAddMarkerURL parses tag, resolves session from SharedState, gets currentOffsetMs, calls appendMarker.
- **ULID + MarkerWriter** — ULID.swift (26-char Crockford base32); MarkerWriter.appendMarker(sessionRoot:offsetMs:tag:) appends to markers.jsonl, updateSessionUpdatedAt writes session.json.
- **Main app** — ContentView: SharedState.setSessionRoot on session open, clear on "Open another session"; onChange(playback.currentOffsetMs) writes SharedState.currentOffsetMs.
- **Widget** — TraceWidgetExtension target; TraceWidget/TraceWidget.swift (WidgetKit, 4 Link buttons to trace://add-marker?tag=...); TraceWidgetExtension.entitlements (same App Group); Info.plist (NSExtension widgetkit-extension).

CLI build and 35 tests pass. iOS app and widget targets in Xcode; add widget to homescreen, open session in app, tap widget button to add marker.
