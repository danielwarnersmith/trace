# TRACE OBS integration

OBS Lua script that ties TRACE session lifecycle to recording start/stop.

## What it does

- **Recording start:** Runs `trace session init <dir>` so a new TRACE session is created. Session path is `&lt;session_base&gt;/YYYY-MM-DDTHH-MM-SS`.
- **Recording stop:** Runs `trace session close <dir>` for that session (status "closed", end_time/duration_ms, session_end in timeline).

The active session path is stored in `~/.trace/obs-active-session.txt` between start and stop.

## Requirements

- **trace** CLI in your PATH (e.g. `npm run build` then `npm link`, or add `node_modules/.bin` / project path to PATH).
- Session base directory set in script properties (where session folders are created).

## Install

1. Build TRACE and ensure `trace` is in PATH:
   ```bash
   npm run build
   npm link   # or add dist/ to PATH
   ```

2. Create the state directory (optional; script will write state file here):
   ```bash
   mkdir -p ~/.trace
   ```

3. In OBS: **Tools → Scripts**. Click **+** and add `trace-obs-session.lua` from this directory.

4. In the script properties, set **Session base directory** to the folder where you want TRACE sessions (e.g. `~/trace-sessions` or your OBS recording output parent).

5. Start/stop a recording in OBS. On start, a new session folder should appear under the session base; on stop, that session’s `session.json` should show status "closed" and timeline should have `session_end`.

## Verify

After stopping a recording:

```bash
trace validate <session_dir>
trace session show <session_dir>
```

You should see status "closed", end_time and duration_ms set, and timeline with session_start and session_end.
