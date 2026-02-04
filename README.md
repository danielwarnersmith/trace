# TRACE

Spec-first repository. Product behavior must conform to `trace-spec/SPEC.md` and
`trace-spec/codex/`.

## Quick start

- `npm install`
- `npm run dev -- --help`
- `npm run dev -- session init ./sessions/demo`
- `npm run dev -- media add ./sessions/demo --file ./audio/take-1.m4a --kind audio --mime audio/mp4 --offset 0 --duration 120000`
- `npm run dev -- validate ./sessions/demo`
- `npm run dev -- transcribe ./sessions/demo --text \"Let's take it from the top.\" --offset 0 --duration 1800`
- `npm run dev -- mark ./sessions/demo --offset 1200 --label \"Warmup\" --tag practice`
- `npm run dev -- voice-note ./sessions/demo --offset 2000 --duration 3200 --media note.m4a --text \"Try softer attack.\"`
- `npm run dev -- digest write ./sessions/demo --file ./notes/digest.md`

## Workspace

- `trace-spec/` holds the normative spec and schemas.
