# MIDI setup for TRACE (Stage 2: Signal)

TRACE Stage 2 (Signal) lets you drop markers during a performance by sending MIDI CC (Control Change) messages from a footswitch or controller. This doc describes how to run the MIDI listener.

## Requirements

- **Active session:** A TRACE session with status `"active"` (e.g. created when OBS starts recording via the OBS integration, or via `trace session init <dir>`). The listener will warn if the session is not active but still run.
- **MIDI input:** A MIDI device (e.g. footswitch, controller) or a virtual MIDI port that sends CC messages. The listener receives CC on a configurable port.

## Run the listener

```bash
trc midi listen <session_dir> [--port <index>]
```

(On macOS the system `trace` is a different tool; use **`trc`** after `npm link`, or `npm run dev -- midi listen ...`.)

- `<session_dir>` — Path to the TRACE session directory. Must exist and validate; session should be active for live markers (later to-dos will write markers).
- `--port <index>` — MIDI input port index (default: 0). List available ports by running the command; if no ports are found, you’ll see an error listing requirements.

The process stays running and logs each received CC to stderr (channel, controller number, value, and category when mapped). Press Ctrl+C to stop.

## CC → category mapping

Each CC can be mapped to one of four categories: **highlight**, **structure**, **texture-sample**, **fix-review** (used later when writing markers). The default mapping (channel 0) is:

| CC number | Category        |
|----------:|-----------------|
| 20        | highlight       |
| 21        | structure       |
| 22        | texture-sample  |
| 23        | fix-review      |

- **Default config:** `trace-spec/midi-categories.json`. Keys are `"channel:controller"` (e.g. `"0:20"`); values are category tag strings.

### Override the default mapping

To use your own CC → category mapping (e.g. for different hardware), **copy `.trace-midi.json.example` to `.trace-midi.json`** in the **repo root** (the directory where you run `trc` from):

```bash
cp .trace-midi.json.example .trace-midi.json
```

Then edit `.trace-midi.json`. Same format: keys are `"channel:controller"` (e.g. `"1:30"`), values are category tags (`highlight`, `structure`, `texture-sample`, `fix-review`). If `.trace-midi.json` exists, it **replaces** the default file entirely. The example file is committed; `.trace-midi.json` is gitignored so your local override is not committed.

## OS and ports

- **macOS:** Uses CoreMIDI. Connect a USB MIDI device or create a virtual input (e.g. with Audio MIDI Setup or a DAW). The listener will list available input ports at startup.
- **Windows:** Uses the system MIDI API. Ensure your device is installed and visible as a MIDI input.
- **Linux:** Not officially documented; RtMidi (used by the `midi` package) supports ALSA and JACK.

## Current behavior (M2 to-dos 1–2)

The listener receives MIDI CC and resolves category from the mapping (to-do 2). It **does not write markers yet**; marker writing is to-do 4 in [milestone-02-midi-marker-input.md](../trace-spec/milestones/milestone-02-midi-marker-input.md).
