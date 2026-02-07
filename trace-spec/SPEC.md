This document is normative. If behavior, data, or terminology is not explicitly
specified here or in codex/, it is undefined and must not be implemented.

# TRACE — System Specification

## Overview

This section is informative. It describes the product and user workflow.
Normative requirements are in the sections that follow.

### What TRACE is

TRACE is a system that lets a person stream, practice, and perform live
music, then review that session on their phone, mark important moments with
minimal effort, and optionally trigger automated actions (like draft clips
or sample extraction) without publishing anything automatically.

TRACE treats every live session as reference material, not finished content.

### The problem TRACE solves

When someone practices or performs live with hardware instruments:

- They stream and record, but later can't remember where the good parts were.
- Reviewing full recordings is slow and easy to avoid.
- Marking moments during a performance is disruptive.
- Existing tools push the user toward editing and publishing too early.
- Interesting textures or mistakes worth fixing get lost.

The result: good musical material exists, but there's no practical way to
capture intent and revisit it later without breaking flow.

### How TRACE solves the problem (by stage)

TRACE splits the workflow into four concrete stages. Each stage has clear
user actions and clear system responsibilities.

#### Stage 1: Capture (streaming and recording with OBS)

**What the user is doing**

- The user starts a livestream in OBS on their Mac.
- OBS is configured to stream (e.g. to YouTube) and record locally at the same time.
- The user performs a live set (e.g. ~30 minutes).

That's it. No extra UI. No TRACE app interaction.

**What TRACE does**

- Creates a new session when recording starts.
- Treats the OBS local recording as the authoritative source.
- Stores the original recording file (video + audio) and a derived audio-only review file (for later listening).

No analysis, no clipping, no decisions.

#### Stage 2: Signal (dropping markers during the performance)

**What the user is doing**

- While playing, the user may press a MIDI button or footswitch.
- This sends a specific MIDI CC on a specific channel.
- The user does not touch their phone.

This is optional. The user may press nothing.

**What TRACE does**

- Listens for MIDI input during the session.
- When a valid CC is received, TRACE writes a marker event with the current session time and a fixed category: Highlight, Structure, Texture / Sample, Fix / Review.
- Markers are timestamped relative to the start of the recording.

Markers do not create clips. Markers do not force later actions. They are just signals that "something mattered here."

#### Stage 3: Reflect (listening and annotating on iPhone 15 Pro)

**What the user is doing**

- Later (same day or later), the user opens a lightweight iOS app on an iPhone 15 Pro.
- The app streams or plays the audio-only review file for that session.
- The user listens casually (walking, resting, etc.).

While listening, the user may:

- Tap a homescreen widget button to add a marker: Highlight, Structure, Texture / Sample, Fix / Review.
- Or tap a Voice Note button: recording starts immediately, the user speaks freely, tap again to stop.

All interactions take ~1–2 seconds. The user does not scrub waveforms, name clips, edit audio, or think about publishing.

**What TRACE does**

- Uses the playback time as the timestamp for markers and voice notes.
- Uploads marker events and voice-note audio to the session.
- Queues uploads if the phone is offline.
- Automatically transcribes voice notes later (locally, on the Mac).

Voice notes are stored as original audio and text transcript (when available).

#### Stage 4: Digest and Actions (reviewing and triggering actions inside the iOS app)

**What the user is doing**

- The user opens the session digest view inside the iOS app.
- They read a short, structured summary: session info, counts of markers, notable moments with timestamps, excerpts from voice notes. This takes under a minute.

From this same view, the user may manually trigger actions (e.g. "Generate clip candidates", "Extract sample regions", "Suggest chapters") or do nothing and close the app. Some actions may be triggered automatically at a scheduled time (e.g. nightly) or by an event (e.g. a new transcript file appears). Nothing publishes automatically.

**What TRACE does**

- Maintains the digest as a living, append-only document.
- When an action is triggered: reads the session data, produces draft outputs (files, ranges, metadata), records the action and its result in the digest.
- If the user rejects an output, that rejection is logged.

Automation assists; the user decides.

### Touch points summary

**Devices**

- Mac: OBS, local recording, background processing.
- iPhone 15 Pro: listening, marking, voice notes, digest, actions.

**User interactions**

1. Start OBS stream/record.
2. (Optional) Press MIDI buttons during the set.
3. Listen to the session on iPhone.
4. Tap homescreen widgets or record voice notes.
5. Read the digest.
6. Trigger actions (or don't).

What needs to be built (capture, MIDI, iOS app, background processing, digest, action framework) is in [ROADMAP.md](ROADMAP.md).

*Note on marker categories:* The overview describes fixed marker categories (Highlight, Structure, Texture/Sample, Fix/Review). These are product intent and may be represented as tags or label, or as a future schema field. See codex MARK.

## Scope

This specification defines the core data model, file layout, and behavioral constraints for sessions and related artifacts. The Overview above is informative. Build priorities and implementation areas: [ROADMAP.md](ROADMAP.md).

Anything not explicitly specified in the normative sections below is out of scope and must not be implemented.

## Normative language

The keywords MUST, MUST NOT, SHOULD, and MAY are to be interpreted as in
RFC 2119.

## Data model (summary)

All persisted data MUST be UTF-8.

### Identifiers

- id fields MUST be ULIDs (26-character Crockford base32, uppercase).
- IDs MUST be unique within the session (the session directory is the scope of uniqueness).

### Timestamps and durations

- Absolute timestamps MUST be RFC 3339 in UTC with a trailing Z.
- Relative time uses integer milliseconds (ms) from session start.
- duration_ms values MUST be integers >= 0.

### Text and tags

- Human-entered text is free-form UTF-8.
- tags are optional, lowercase strings using letters, numbers, hyphen, underscore.

## Session storage layout

A session is represented by a directory containing these files. The parent
location is implementation-defined; the system MUST be able to operate on any
session directory regardless of its parent path.

Required files:

- session.json (single JSON object)
- timeline.jsonl (JSONL event list)
- markers.jsonl (JSONL marker list)

Optional files:

- transcript.jsonl (JSONL transcript segments)
- voice_notes.jsonl (JSONL voice note list)
- digest.md (UTF-8 Markdown)
- actions.jsonl (JSONL action run list)
- media/ (directory containing captured media)

All JSON files MUST validate against their corresponding schema in
trace-spec/schemas/. The canonical set of session.json fields is defined by
session.schema.json; when and how they are set is defined in codex (INGEST,
TRANSCRIBE, DIGEST).

## Authoritativeness and mutability

- Files on disk are the source of truth. There is no hidden database layer.
- Manual edits to files are authoritative and MUST be respected on read.
- When the system rewrites a file, it MUST preserve all valid data it does not
  explicitly change.

## Ordering

JSONL files are ordered lists. If multiple entries share the same id, the last
entry in file order is authoritative for that id.

Ordering constraints:

- timeline.jsonl entries MUST be in non-decreasing order by offset_ms.
- transcript.jsonl entries MUST be in non-decreasing order by offset_ms.
- markers.jsonl and voice_notes.jsonl have no required ordering; append order
  is sufficient. Last entry per id is authoritative (see above).

## Referential integrity and file existence

- If a marker includes voice_note_id, voice_notes.jsonl MUST exist and contain
  an entry with that id.
- If a voice note includes marker_id, markers.jsonl MUST contain an entry with
  that id.
- media paths referenced by session.json.media entries MUST exist on disk
  relative to the session directory.
- media_path referenced by voice notes MUST exist on disk relative to the
  session directory.
- Voice note media files (referenced by voice_note.media_path) need NOT
  appear in session.json.media. Voice notes are context for markers; their
  media is associated with the voice note, not the session's primary media
  list.

## Errors

Operations that cannot complete successfully MUST fail with a clear,
implementation-defined error. Unless specified otherwise in codex, the system
MUST NOT partially update session files on failure (e.g. no half-written
JSONL). TRANSCRIBE specifies "MUST fail with a clear error" when no suitable
media exists; other codex docs may add failure semantics.

## Conformance

An implementation is conformant if it:

- Writes only data defined by this specification.
- Produces files that validate against the schemas.
- Follows the behavioral constraints in codex/.

## Out of scope

Publishing, distribution, or social features are explicitly out of scope.
