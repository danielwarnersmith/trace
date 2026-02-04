This document is normative. If behavior, data, or terminology is not explicitly
specified here or in codex/, it is undefined and must not be implemented.

# TRACE — System Specification

## Purpose

TRACE is a temporal recording and annotation system for live performance.

It captures sessions as authoritative references, supports low-friction
annotation, and enables optional, user-invoked automation for extraction
and reuse.

TRACE is practice-first, archive-oriented, and human-authoritative.

TRACE is not a publishing system.

## Scope

This specification defines:

- The core data model for sessions and related artifacts.
- Required file formats and storage layout for a session.
- Behavioral constraints for ingest, transcription, marking, digest, and actions.

Anything not explicitly specified is out of scope and must not be implemented.

## Normative language

The keywords MUST, MUST NOT, SHOULD, and MAY are to be interpreted as in
RFC 2119.

## Data model (summary)

All persisted data MUST be UTF-8.

### Identifiers

- id fields MUST be ULIDs (26-character Crockford base32, uppercase).
- IDs MUST be globally unique within a TRACE repository.

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
trace-spec/schemas/ once those schemas are defined.

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

## Referential integrity and file existence

- If a marker includes voice_note_id, voice_notes.jsonl MUST exist and contain
  an entry with that id.
- If a voice note includes marker_id, markers.jsonl MUST contain an entry with
  that id.
- media paths referenced by session.json.media entries MUST exist on disk
  relative to the session directory.
- media_path referenced by voice notes MUST exist on disk relative to the
  session directory.

## Conformance

An implementation is conformant if it:

- Writes only data defined by this specification.
- Produces files that validate against the schemas.
- Follows the behavioral constraints in codex/.

## Out of scope

Publishing, distribution, or social features are explicitly out of scope.
