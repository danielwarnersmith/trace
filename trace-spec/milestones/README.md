# TRACE milestones

Milestones break [ROADMAP.md](../ROADMAP.md) into ordered, agent-ready task lists. Each milestone file contains spec/codex references, to-dos with context (what to read, what to implement, where, acceptance criteria), and dependencies.

## Current milestones

| Milestone | File | Goal | Status |
|-----------|------|------|--------|
| **M1** | [milestone-01-obs-capture-and-review-audio.md](milestone-01-obs-capture-and-review-audio.md) | OBS-side capture: session creation on recording start/stop, reliable local recording docs, review-audio generation and ingest. | Done |
| **M2** | [milestone-02-midi-marker-input.md](milestone-02-midi-marker-input.md) | MIDI marker input: listener, fixed CC → category mapping, timestamped marker writing. | Done |
| **M3** | [milestone-03-digest-system-enhancement.md](milestone-03-digest-system-enhancement.md) | Digest system: generate digest from timeline + transcripts + markers; log actions and outcomes in digest. | Done |
| **M4** | [milestone-04-action-framework.md](milestone-04-action-framework.md) | Action framework (extensible): registry/discovery, draft-only outputs, optional scheduled/event-based trigger. | Done |
| **M5** | [milestone-05-background-processing.md](milestone-05-background-processing.md) | Background processing: voice note transcript update, file-based jobs, low-priority execution. | Done |
| **M6** | [milestone-06-ios-app-core.md](milestone-06-ios-app-core.md) | iOS app (core): audio playback, homescreen widget for markers, voice note recording, offline upload queue, digest view, action trigger UI. | Next |

## Further milestones (from ROADMAP)

Not yet broken into milestone files; to be scoped by product-manager when needed:

- *(None; iOS app core is M6.)*

## How to use

1. Pick a milestone file (e.g. M1).
2. Work through to-dos in order; each to-do has **Read**, **Implement**, **Where**, **Done when**.
3. Run `trace validate <dir>` and tests after changes.
4. When a milestone is done, move on to the next or scope the next set (e.g. iOS app) with the product-manager subagent.

### Running with eng-manager

For plan → delegate → verify (plans in `trace-spec/plans/`, archive when done), use the **eng-manager** subagent:

- **Prompt**: `@.cursor/agents Use eng-manager to run the next set from trace-spec/milestones` or "Use eng-manager to do the next milestone TODOs."
- Eng-manager reads milestones, writes a plan per to-do, delegates to an agent, verifies completion, and archives the plan. If something fails, it re-delegates until it works.

### Workflow tips

- **Quarterly**: Re-run the workflow-coach subagent ("what's new in Cursor/agents/rules and what should we adopt?") to stay current.
- **New agents**: When adding a subagent under `.cursor/agents/`, update `.cursor/agents/README.md` (agent index). If the agent is a primary entry point (e.g. eng-manager for execution), mention it in conductor-delegation or AGENTS.md.
