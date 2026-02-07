# Plan: M6 iOS app — Scaffold and to-do 1 (audio playback)

**Goal:** M6 is the next milestone (iOS app core). The repo has no iOS app yet. (1) Add an iOS app scaffold: `apps/ios/` with README and a design doc that defines session model, playback contract, and how the app gets session data so an implementer (or future pass) can create the Xcode project and implement to-do 1. (2) Optionally add minimal Swift types (session model, playback position) as reference; no full Xcode project required in this plan. CLI build and tests must still pass.

**Spec:** [milestone-06-ios-app-core.md](../milestones/milestone-06-ios-app-core.md) to-do 1; SPEC Stage 3; codex INGEST.

**Implemented:** Branch feature/m06-ios-scaffold. apps/ios/README.md (M6 to-dos, link to design); trace-spec/design/ios-app.md (session model, review audio resolution, playback contract offset_ms, session data source options, markers/voice notes/digest/actions). M6 to-do 1 (Swift playback) deferred until Xcode project exists. CLI build and 35 tests pass.
