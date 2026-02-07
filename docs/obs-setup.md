# OBS setup for TRACE

TRACE Stage 1 (Capture) assumes you stream and record with OBS on your Mac. This doc describes the OBS setup so TRACE can use the recording as the authoritative source.

## Requirements

- OBS Studio with **local recording** enabled (stream and record at the same time).
- TRACE OBS integration installed so a TRACE session is created when recording starts and closed when it stops (see [integrations/obs/](../integrations/obs/README.md)). Use **`trc`** for the CLI on macOS (system `trace` is different).

## Recommended OBS settings

1. **Output → Recording**
   - **Recording path:** Use a dedicated folder (e.g. `~/Recordings/OBS` or the same parent as your TRACE session base). TRACE does not require a specific path; the integration creates session folders under the *session base* you set in the Lua script (separate from OBS recording path if you prefer).
   - **Recording format:** MKV or MP4. TRACE will use this file as the authoritative source; the integration can later derive a review-audio file from it (see roadmap).
   - **Encoder / quality:** Choose settings that avoid drops (e.g. same drive as TRACE sessions or fast enough storage).

2. **Stream**
   - Configure as usual (e.g. YouTube, Twitch). TRACE does not depend on stream destination.

3. **Reliable recording**
   - Prefer writing to a local SSD or fast drive to avoid frame drops.
   - If OBS and TRACE session base are on different drives, ensure both have enough space and throughput.

## Flow

1. You start a livestream in OBS and start recording.
2. The TRACE OBS script runs `trace session init <session_base>/<timestamp>` so a new session directory exists.
3. You perform your set; OBS writes the local recording.
4. You stop recording; the script runs `trace session close <session_dir>` so the session is closed (end_time, duration_ms, session_end in timeline).
5. Later, you can ingest the OBS recording (and optionally a derived review-audio file) into that session (see milestone and roadmap).

No extra UI or TRACE app interaction during the performance.

## Review-audio (optional)

To derive an audio-only review file from an OBS recording and add it to a session, use:

```bash
trace media add-review-audio <session_dir> --source <path_to_obs_recording>
```

This requires **ffmpeg** on your PATH. The command extracts audio from the source (video or audio) and ingests it as a media item with kind `audio`; the file is stored under the session’s `media/` directory. If ffmpeg is not installed, the command fails with a clear error.
