-- TRACE OBS integration: create TRACE session on recording start, close on recording stop.
-- Requires: trace CLI in PATH. Configure session base directory in script properties.

obs = obslua

-- Script properties
SESSION_BASE = ""
STATE_FILE = nil  -- set in script_load from HOME/USERPROFILE

function script_description()
  return "TRACE session lifecycle: run 'trace session init' on recording start and 'trace session close' on recording stop. Set the session base directory (where session folders are created)."
end

function script_properties()
  local props = obs.obs_properties_create()
  obs.obs_properties_add_path(props, "session_base", "Session base directory", obs.OBS_PATH_DIRECTORY, nil, nil)
  return props
end

function script_defaults(settings)
  obs.obs_data_set_default_string(settings, "session_base", os.getenv("HOME") or os.getenv("USERPROFILE") or ".")
end

function script_load(settings)
  local home = os.getenv("HOME") or os.getenv("USERPROFILE") or "."
  STATE_FILE = home .. "/.trace/obs-active-session.txt"
  SESSION_BASE = obs.obs_data_get_string(settings, "session_base") or (home .. "/trace-sessions")
  obs.obs_frontend_add_event_callback(on_frontend_event)
end

function script_unload()
  obs.obs_frontend_remove_event_callback(on_frontend_event)
end

function script_update(settings)
  SESSION_BASE = obs.obs_data_get_string(settings, "session_base") or (os.getenv("HOME") or os.getenv("USERPROFILE") or ".") .. "/trace-sessions"
end

function on_frontend_event(event)
  if event == obs.OBS_FRONTEND_EVENT_RECORDING_STARTED then
    on_recording_started()
  elseif event == obs.OBS_FRONTEND_EVENT_RECORDING_STOPPED then
    on_recording_stopped()
  end
end

function on_recording_started()
  local base = SESSION_BASE:gsub("^%s+", ""):gsub("%s+$", "")
  if base == "" then
    obs.script_log(obs.LOG_WARNING, "TRACE OBS: session base directory not set; skipping session init")
    return
  end
  -- Session path: base/YYYY-MM-DDTHH-MM-SS so each recording gets a unique dir
  local session_name = os.date("%Y-%m-%dT%H-%M-%S")
  local session_path = base .. "/" .. session_name
  -- Escape for shell: quote path
  local quoted = '"' .. session_path:gsub('"', '\\"') .. '"'
  local cmd = "trace session init " .. quoted
  local ok = os.execute(cmd)
  if ok then
    write_state_file(session_path)
    obs.script_log(obs.LOG_INFO, "TRACE OBS: session created: " .. session_path)
  else
    obs.script_log(obs.LOG_ERROR, "TRACE OBS: failed to run: " .. cmd .. " (ensure trace CLI is in PATH)")
  end
end

function on_recording_stopped()
  local path = read_state_file()
  if not path or path == "" then
    obs.script_log(obs.LOG_WARNING, "TRACE OBS: no active session path; skipping session close")
    return
  end
  local quoted = '"' .. path:gsub('"', '\\"') .. '"'
  local cmd = "trace session close " .. quoted
  local ok = os.execute(cmd)
  if ok then
    obs.script_log(obs.LOG_INFO, "TRACE OBS: session closed: " .. path)
  else
    obs.script_log(obs.LOG_ERROR, "TRACE OBS: failed to run: " .. cmd)
  end
  clear_state_file()
end

function write_state_file(session_path)
  local dir = STATE_FILE:match("^(.+)[/\\][^/\\]+$")
  if dir then
    local quoted = dir:gsub('"', '\\"')
    if package.config:sub(1, 1) == "\\" then
      os.execute('if not exist "' .. quoted .. '" mkdir "' .. quoted .. '"')
    else
      os.execute('mkdir -p "' .. quoted .. '" 2>/dev/null')
    end
  end
  local f = io.open(STATE_FILE, "w")
  if f then
    f:write(session_path)
    f:close()
  end
end

function read_state_file()
  local f = io.open(STATE_FILE, "r")
  if not f then return nil end
  local path = f:read("*a"):gsub("^%s+", ""):gsub("%s+$", "")
  f:close()
  return path
end

function clear_state_file()
  os.remove(STATE_FILE)
end
