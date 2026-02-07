# TRACE

Spec-first repository. Product behavior must conform to `trace-spec/SPEC.md` and
`trace-spec/codex/`.

## Quick start

- `npm install` and `npm run build`
- To use **`trc`** in your shell: run **`npm link`** from this repo (once per clone/branch). If `trc` is not found, run `npm link` from the project root.
- On macOS, the system has a `trace` command (kdebug); use **`trc`** for this CLI, or use `npm run dev --`:
- `npm run dev -- --help`
- `npm run dev -- session init ./sessions/demo` (or `trc session init ./sessions/demo`)
- `npm run dev -- session close ./sessions/demo`
- `npm run dev -- session show ./sessions/demo`
- `npm run dev -- media add ./sessions/demo --file ./audio/take-1.m4a --kind audio --mime audio/mp4 --offset 0 --duration 120000`
- `npm run dev -- validate ./sessions/demo`
- `npm run dev -- transcribe ./sessions/demo --text \"Let's take it from the top.\" --offset 0 --duration 1800`
- `npm run dev -- mark ./sessions/demo --offset 1200 --label \"Warmup\" --tag practice`
- `npm run dev -- markers list ./sessions/demo [--tag practice]`
- `npm run dev -- voice-note ./sessions/demo --offset 2000 --duration 3200 --media note.m4a --text \"Try softer attack.\"`
- `npm run dev -- voice-note ./sessions/demo --offset 2000 --duration 3200 --media-file ./recordings/note.m4a`
- `npm run dev -- digest write ./sessions/demo --file ./notes/digest.md`
- `npm run dev -- digest read ./sessions/demo`
- `npm run dev -- action run ./sessions/demo <action-id> [--input key=value ...]`
- `npm run dev -- midi listen ./sessions/demo [--port 0]` (or `trc midi listen ...`)
- **MIDI category override:** Copy `.trace-midi.json.example` to `.trace-midi.json` in the repo root to override the default CC → category mapping; see [docs/midi-setup.md](docs/midi-setup.md).

## Workspace

- `trace-spec/` holds the normative spec and schemas.

## Development

Cursor agents: conductor, debugger, git-doctor, plan-optimizer, workflow-coach. Use conductor for non-trivial tasks (multi-step work, refactors, planning); handle quick fixes and lookups directly. Agent index: `.cursor/agents/README.md`.
