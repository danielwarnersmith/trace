# Plan: M6 To-do 5 — Digest view (implemented)

**Goal:** Implement M6 to-do 5: digest view that displays the session's digest.md (UTF-8 Markdown) or placeholder. Read-only.

**Spec:** [milestone-06-ios-app-core.md](../milestones/milestone-06-ios-app-core.md) to-do 5; [trace-spec/codex/DIGEST.md](../codex/DIGEST.md).

**Implemented:** Branch feature/m06-todo5-digest-view.

- **loadDigest(from:)** — Reads digest.md from session root; returns UTF-8 string or nil.
- **DigestView** — SwiftUI view; loads digest on appear; displays as AttributedString(markdown:) in ScrollView or placeholder "No digest. Run digest generate on the Mac."
- **ContentView** — Wrapped in NavigationStack; "Digest" NavigationLink in playback view to DigestView(sessionRoot:).

CLI build and 35 tests pass.
