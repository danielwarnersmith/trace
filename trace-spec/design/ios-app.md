# iOS app design (TRACE Stage 3–4)

Design for the TRACE iOS app: session model, playback, and how the app reads/writes session data. Implementation lives in `apps/ios/` or a separate repo (e.g. trace-ios).

## Session model

- **Session** — Directory with session.json, timeline.jsonl, markers.jsonl, optional voice_notes.jsonl, digest.md, actions.jsonl, media/. See [trace-spec/SPEC.md](../SPEC.md) Session storage layout and [trace-spec/codex/INGEST.md](../codex/INGEST.md).
- **session.json** — id, start_time, status, timeline_path, markers_path, voice_notes_path, media (array of { id, kind, path, mime, created_at, start_offset_ms, duration_ms? }). Paths are relative to the session directory.
- **Review audio** — The session’s primary or review audio is one of session.json.media with kind "audio" (or "video"). Convention: the first audio entry, or an entry with a known role (e.g. path containing "review"). Path is relative (e.g. media/<id>.m4a); the app resolves it to a full URL given the session root (see “Session data source” below).

## Playback contract (to-do 1)

- **Input** — Session root (URL or path) and resolved review-audio URL.
- **Behavior** — App plays the audio from start. Playback position MUST be exposed as **offset_ms** (integer milliseconds from session start). Session start is session.json.start_time (RFC 3339); offset_ms = current playback time in ms (e.g. 0 at start, 120000 at 2 minutes).
- **Output** — Current offset_ms is used by: (1) widget/add-marker flow — new marker gets offset_ms = current playback position; (2) voice note flow — voice note gets offset_ms = position at tap-to-start, duration_ms = length of recording.
- **Implementation** — Use AVPlayer (or equivalent); observe currentTime, convert to ms; align with session start if needed (e.g. session start = 0 for playback).

## Session data source

How the iPhone gets the session directory and media is implementation-defined. Options:

- **Sync service** — Backend syncs session dir (or a subset) to the device; app reads from local copy.
- **REST API** — App fetches session.json, markers.jsonl, media URLs from an API that serves the session; writes (markers, voice notes) via API that updates the session dir.
- **File share / Files app** — User opens a session folder from iCloud or local storage; app gets a security-scoped URL.

Until one is chosen, the app can assume a **local session root** (e.g. sandbox or app group) where session.json and media/ are present; playback and to-dos 1–6 use that root.

## Markers and voice notes (to-dos 2–4)

- **Marker** — id (ULID), offset_ms, created_at, source "user", tags or label per [MARK](../codex/MARK.md). Append to markers.jsonl; update session.json.updated_at.
- **Voice note** — id, media_path, offset_ms, duration_ms, optional transcript_text per voice_note schema. Append to voice_notes.jsonl; write audio file to media/; update session.json.updated_at and voice_notes_path.
- **Offline queue** — When offline, store pending markers and voice notes (payloads) in local persistence; when online, write them to the session (append to JSONL, upload media) and clear the queue. Idempotency: use ULIDs so retries do not duplicate entries.

## Digest and actions (to-dos 5–6)

- **Digest** — Read digest.md (UTF-8 Markdown) from session root; display read-only. Per [DIGEST](../codex/DIGEST.md).
- **Actions** — Triggering an action MUST log a run to actions.jsonl (id, action, created_at, status, optional inputs/outputs/error) per [ACTIONS](../codex/ACTIONS.md). App may call a backend that runs `trace action run` or write to a synced session.

## Current scope

Xcode project exists under `apps/ios/Trace/`. To-do 1 (audio playback) is implemented: session model (Session.swift), playback service (PlaybackService.swift) with AVPlayer and currentOffsetMs, and ContentView with folder picker and play/pause UI. Implement to-dos 2–6 per this design and [milestone-06-ios-app-core.md](../milestones/milestone-06-ios-app-core.md).
