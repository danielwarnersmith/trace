# Milestone 6: iOS app (core)

**Goal:** A lightweight iOS app (iPhone 15 Pro) for Stage 3 (Reflect) and Stage 4 (Digest and Actions): play review audio, add markers via widget, record voice notes, upload to session, view digest, trigger actions. Offline-safe queue for uploads.

**Spec/codex references:**

- [trace-spec/SPEC.md](../SPEC.md) — Overview Stage 3 (Reflect): "The app streams or plays the audio-only review file"; "Tap a homescreen widget button to add a marker"; "Voice Note button: recording starts immediately, tap again to stop"; "Uploads marker events and voice-note audio to the session"; "Queues uploads if the phone is offline." Stage 4: digest view, action trigger. Touch points: iPhone 15 Pro.
- [trace-spec/codex/INGEST.md](../codex/INGEST.md) — Session layout, media paths.
- [trace-spec/codex/MARK.md](../codex/MARK.md) — Marker shape (offset_ms, tags/label), append to markers.jsonl.
- [trace-spec/codex/DIGEST.md](../codex/DIGEST.md) — digest.md read.
- [trace-spec/codex/ACTIONS.md](../codex/ACTIONS.md) — Action runs; user-invoked.
- [trace-spec/schemas/](../schemas/) — session, marker, voice_note schemas for payloads.

**Existing implementation:**

- CLI and Mac: session init/close, media, markers, voice notes (add), digest read/generate, action run, jobs. Session dir is the source of truth; no iOS app yet.

**Assumptions:**

- iOS app targets iPhone 15 Pro; may live in a separate repo (e.g. `trace-ios`) or under `apps/ios/`. Session directory is synced or accessible (e.g. via shared volume, sync service, or API that the CLI/backend exposes). For "upload to session", the app MUST produce the same file layout (markers.jsonl, voice_notes.jsonl, media/) that the spec defines; upload mechanism (sync service, REST, file share) is implementation-defined.

---

## To-dos

### 1. Audio playback for review files

**Read:** [trace-spec/SPEC.md](../SPEC.md) Stage 3 — "The app streams or plays the audio-only review file for that session." [trace-spec/codex/INGEST.md](../codex/INGEST.md) — session.json.media, media paths.

**Implement:** In the iOS app, implement playback of the session's review audio. Session has media entries (session.json.media); at least one may be the review file (e.g. kind "audio", path like media/<id>.m4a). App MUST resolve the session's review or primary audio URL/path and play it. Playback position MUST be available (current time in ms from start) for use as marker/voice-note offset_ms.

**Where:** iOS app (e.g. apps/ios/ or trace-ios repo): playback service or view model, audio session, player that reports current time. Use AVFoundation or equivalent.

**Done when:** User can open a session in the app and hear the review audio; playback position is exposed for downstream to-dos (markers, voice notes at current time).

*Design/scaffold: [trace-spec/design/ios-app.md](../design/ios-app.md) (session model, playback contract offset_ms, review audio resolution); [apps/ios/README.md](../../apps/ios/README.md). Implementation (Swift + Xcode) when iOS project is added.*

---

### 2. Homescreen widget for markers

**Read:** [trace-spec/SPEC.md](../SPEC.md) Stage 3 — "Tap a homescreen widget button to add a marker: Highlight, Structure, Texture / Sample, Fix / Review." [trace-spec/codex/MARK.md](../codex/MARK.md) — marker: id, offset_ms, created_at, source "user", tags or label.

**Implement:** A homescreen widget (e.g. WidgetKit) that shows one or more buttons corresponding to the four marker categories (Highlight, Structure, Texture/Sample, Fix/Review). When the user taps a button, the app (or widget extension) MUST create a marker with offset_ms = current playback position (or "now" if no playback) and the chosen category (as tag or label per MARK). Marker MUST be appended to the session's markers.jsonl and session.json.updated_at updated—either by the app writing to a local session copy that syncs, or by calling an API that performs the write. If the device is offline, the marker MUST be queued (to-do 4) and written when online.

**Where:** iOS app: widget extension, app group or shared state for "current session" and "current playback offset_ms", marker write or API client.

**Done when:** Tapping a widget button adds a marker with the correct category and current time; markers appear in markers.jsonl (after sync if queued).

---

### 3. Tap-to-toggle voice note recording

**Read:** [trace-spec/SPEC.md](../SPEC.md) Stage 3 — "Tap a Voice Note button: recording starts immediately, the user speaks freely, tap again to stop." Voice notes stored as original audio and transcript (when available). [trace-spec/schemas/voice_note.schema.json](../schemas/voice_note.schema.json) — id, media_path, offset_ms, duration_ms, transcript_text optional.

**Implement:** In the iOS app, a Voice Note button that starts recording on first tap (offset_ms = current playback position at tap) and stops on second tap. Save the recording to a local file; create a voice note entry (id, media_path, offset_ms, duration_ms) and queue upload (to-do 4) so the file and entry eventually land in the session's media/ and voice_notes.jsonl. If offline, queue for later.

**Where:** iOS app: record button, AVAudioRecorder or equivalent, voice note payload construction, enqueue for upload.

**Done when:** User can tap to start/stop a voice note; recording is stored and a voice note entry is created with correct offset_ms and duration_ms; file and entry are uploaded to session when online (or queued).

---

### 4. Offline-safe upload queue

**Read:** [trace-spec/SPEC.md](../SPEC.md) Stage 3 — "Uploads marker events and voice-note audio to the session. Queues uploads if the phone is offline."

**Implement:** An upload queue in the iOS app that holds pending markers and voice notes (and optionally other payloads). When the device is online and the session is reachable, the queue MUST be drained: markers appended to markers.jsonl, voice note audio and metadata written to session (media/ + voice_notes.jsonl). When offline, MUST persist the queue locally (e.g. UserDefaults, Core Data, or file) and retry when connectivity returns. Idempotency or deduplication is implementation-defined; spec requires that session files remain valid (e.g. no duplicate ids if app retries).

**Where:** iOS app: queue storage, upload service, network reachability, session write or API client.

**Done when:** Markers and voice notes created offline are persisted in the queue and successfully written to the session when back online; no data loss when app is killed and restarted before upload.

---

### 5. Digest view

**Read:** [trace-spec/SPEC.md](../SPEC.md) Stage 4 — "The user opens the session digest view inside the iOS app. They read a short, structured summary: session info, counts of markers, notable moments with timestamps, excerpts from voice notes." [trace-spec/codex/DIGEST.md](../codex/DIGEST.md) — digest.md UTF-8 Markdown.

**Implement:** A digest view in the iOS app that displays the session's digest.md (or equivalent content). If digest.md is missing, show a placeholder or prompt to generate (e.g. "Run digest generate on the Mac"). Content MUST be read-only in the app (edits are authoritative on disk per DIGEST; app can refresh when session syncs).

**Where:** iOS app: digest screen, load digest.md or synced content, render Markdown (e.g. attributed string or WebView).

**Done when:** User can open the digest view and see the session summary (session info, marker count, notable moments, voice note excerpts when present).

---

### 6. Action trigger UI

**Read:** [trace-spec/SPEC.md](../SPEC.md) Stage 4 — "From this same view, the user may manually trigger actions (e.g. 'Generate clip candidates', 'Extract sample regions')." [trace-spec/codex/ACTIONS.md](../codex/ACTIONS.md) — actions are user-invoked, optional; runs logged to actions.jsonl.

**Implement:** In the iOS app, a way to trigger one or more actions for the session (e.g. from the digest view or a dedicated actions list). Triggering an action MUST result in the same outcome as CLI `trace action run <dir> <action-id>`: a run logged to actions.jsonl with id, action, created_at, status. Implementation may call a backend/CLI or write to a synced session; the session's actions.jsonl MUST be updated per ACTIONS codex.

**Where:** iOS app: action list or buttons, action run request (API or local write), display of run status or digest refresh.

**Done when:** User can trigger at least one action from the app; the run appears in actions.jsonl and (after sync) in the digest's Recent actions section.

---

## Dependencies

- Session and media exist (M1). Markers, voice notes, digest, actions are defined and implemented on CLI (M2–M5). iOS app consumes or replicates the same session layout; no new schema required.

## Further work

- Sync strategy: how the iPhone gets session dir updates (sync service, API, manual copy). Define in a follow-up milestone or design doc.
- Local STT on device for voice notes (optional); currently backend/CLI can run transcribe_voice_note job.
