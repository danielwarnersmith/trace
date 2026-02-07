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

The process stays running and logs each received CC to stderr (channel, controller number, value). Press Ctrl+C to stop.

## OS and ports

- **macOS:** Uses CoreMIDI. Connect a USB MIDI device or create a virtual input (e.g. with Audio MIDI Setup or a DAW). The listener will list available input ports at startup.
- **Windows:** Uses the system MIDI API. Ensure your device is installed and visible as a MIDI input.
- **Linux:** Not officially documented; RtMidi (used by the `midi` package) supports ALSA and JACK.

## Current behavior (M2 to-do 1)

The listener **only receives and logs** MIDI CC. It does not write markers yet. Marker writing (and CC → category mapping) are later to-dos in [milestone-02-midi-marker-input.md](../trace-spec/milestones/milestone-02-midi-marker-input.md).
