# Plan: M3 To-dos 1 & 2 — Digest input and generate

**Goal:** Given a session directory, read timeline, transcript, markers, and optionally voice_notes into a structured digest input; then generate Markdown content for digest.md (session info, marker count, notable moments). No CLI command yet (to-do 3); this delivers the data layer and generator.

**Spec/codex:** [trace-spec/SPEC.md](../SPEC.md) Stage 4; [trace-spec/codex/DIGEST.md](../codex/DIGEST.md); [milestone-03-digest-system-enhancement.md](../milestones/milestone-03-digest-system-enhancement.md) to-dos 1 and 2.

**Steps:**

1. **To-do 1:** New module that, given session dir, reads session.json for timeline_path, markers_path, transcript_path, voice_notes_path. Read each JSONL file (timeline and markers required; transcript and voice_notes optional — missing file = empty array). Return a single DigestInput type: session summary (id, start_time, status, end_time?, duration_ms?), timeline entries (offset_ms, kind), transcript segments (offset_ms, duration_ms, text), markers (offset_ms, label?, tags?), voice note summaries (offset_ms, duration_ms?, transcript_text?). Handle missing optional files without failing.
2. **To-do 2:** Function that takes DigestInput and returns a Markdown string. Content MUST include: session info (id, start_time, duration if closed), count of markers, notable moments (markers with offset_ms and label/tags). Free-form Markdown; no rigid template. Caller will pass result to writeDigest in to-do 3.

**Where:** New `src/digest/` module: `read-input.ts` (readDigestInput), `generate.ts` (generateDigestContent), `types.ts` or inline types. Use session paths from session.json; resolve paths relative to session dir.

**Acceptance:** Given a session dir (e.g. trace-spec/fixtures or test session), readDigestInput returns structure with timeline, markers, transcript (if present), voice_notes (if present). generateDigestContent(input) returns Markdown with session info, marker count, and at least one notable moment (marker with timestamp). Run against fixtures; all existing JSONL files read and parsed.

**Agent:** Implement in repo; run npm run build, npm test.

**Implemented:** Branch feature/m03-digest-generate. src/digest/: types.ts (DigestInput, DigestSessionSummary, DigestTimelineEntry, DigestMarker, etc.), read-input.ts (readDigestInput using session paths; missing optional files => []), generate.ts (generateDigestContent: session info, marker count, Notable moments). test/digest.test.ts: readDigestInput from fixtures, generateDigestContent produces markdown. Build and 32 tests pass.
