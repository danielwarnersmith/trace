#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { initSession } from './commands/session-init.js';
import { closeSession } from './commands/session-close.js';
import { showSession, formatSessionShow } from './commands/session-show.js';
import { listMarkers, formatMarkerEntry } from './commands/markers-list.js';
import { readDigest } from './commands/digest.js';
import { addMarker, addVoiceNote } from './commands/mark.js';
import { addMedia, addReviewAudio } from './commands/media.js';
import { transcribeSession } from './commands/transcribe.js';
import { writeDigest } from './commands/digest.js';
import { validateSessionDir } from './commands/validate-session.js';
import { runAction } from './commands/action-run.js';
import { createMidiListener, getInputPortNames } from './midi/listener.js';
import { validateAllFixtures } from './validation/fixtures.js';

const usage = `TRACE CLI

Usage:
  trace session init <dir>
  trace session close <dir>
  trace session show <dir>
  trace media add <dir> --file <path> --kind <kind> --mime <mime> --offset <ms> [--duration <ms>]
  trace media add-review-audio <dir> --source <path>
  trace transcribe <dir> --file <path> | --text <text> [--offset <ms>] [--duration <ms>]
  trace mark <dir> --offset <ms> [--label <label>] [--note <text>] [--tag <tag> ...] [--voice-note-id <id>]
  trace markers list <dir> [--tag <tag>] [--offset-min <ms>] [--offset-max <ms>]
  trace voice-note <dir> --offset <ms> --duration <ms> (--media <filename> | --media-file <path>) [--text <text>] [--marker-id <id>]
  trace digest write <dir> --file <path>
  trace digest read <dir>
  trace action run <dir> <action-id> [--input key=value ...]
  trace midi listen <dir> [--port <index>]
  trace validate <dir>
  trace validate-fixtures
  trace --help
`;

function printUsage(): void {
  console.log(usage.trimEnd());
}

async function runValidateFixtures(): Promise<number> {
  const results = await validateAllFixtures();
  const failures = results.filter((result) => !result.ok);

  for (const result of results) {
    if (result.ok) {
      console.log(`ok: ${result.name}`);
    } else {
      for (const error of result.errors) {
        console.error(`error: ${result.name}: ${error}`);
      }
    }
  }

  return failures.length === 0 ? 0 : 1;
}

async function runValidateSession(dir: string): Promise<number> {
  const report = await validateSessionDir(dir);
  if (report.ok) {
    console.log(`ok: ${dir}`);
    return 0;
  }

  for (const issue of report.issues) {
    console.error(`error: ${issue.file}: ${issue.message}`);
  }

  return 1;
}

async function runInit(dir: string): Promise<number> {
  const result = await initSession(dir);
  console.log(`created: ${result.sessionDir} (id ${result.sessionId})`);
  return 0;
}

function getFlagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

function getFlagValues(args: string[], flag: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === flag && args[i + 1]) {
      values.push(args[i + 1]);
    }
  }
  return values;
}

function parseNonNegativeInt(input: string | undefined, label: string): number {
  if (!input) {
    throw new Error(`missing ${label}`);
  }
  const parsed = Number(input);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`invalid ${label}`);
  }
  return parsed;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  const [command, subcommand, ...rest] = args;

  if (command === 'session' && subcommand === 'init') {
    const targetDir = rest[0];
    if (!targetDir) {
      console.error('error: missing <dir> for session init');
      printUsage();
      process.exit(1);
    }
    process.exit(await runInit(targetDir));
  }

  if (command === 'session' && subcommand === 'close') {
    const targetDir = rest[0];
    if (!targetDir) {
      console.error('error: missing <dir> for session close');
      printUsage();
      process.exit(1);
    }

    const result = await closeSession(targetDir);
    console.log(`closed: ${targetDir} (duration ${result.duration_ms}ms)`);
    process.exit(0);
  }

  if (command === 'session' && subcommand === 'show') {
    const targetDir = rest[0];
    if (!targetDir) {
      console.error('error: missing <dir> for session show');
      printUsage();
      process.exit(1);
    }

    const result = await showSession(targetDir);
    console.log(formatSessionShow(result));
    process.exit(0);
  }

  if (command === 'media' && subcommand === 'add') {
    const targetDir = rest[0];
    if (!targetDir) {
      console.error('error: missing <dir> for media add');
      printUsage();
      process.exit(1);
    }

    const filePath = getFlagValue(rest, '--file');
    const kind = getFlagValue(rest, '--kind');
    const mime = getFlagValue(rest, '--mime');
    const offset = parseNonNegativeInt(getFlagValue(rest, '--offset'), 'offset');
    const durationValue = getFlagValue(rest, '--duration');
    const duration = durationValue ? parseNonNegativeInt(durationValue, 'duration') : undefined;

    if (!filePath || !kind || !mime) {
      throw new Error('missing --file, --kind, or --mime for media add');
    }

    const validKinds = new Set(['audio', 'video', 'screen', 'other']);
    if (!validKinds.has(kind)) {
      throw new Error('invalid --kind (use audio, video, screen, other)');
    }

    const result = await addMedia(targetDir, {
      filePath,
      kind: kind as 'audio' | 'video' | 'screen' | 'other',
      mime,
      start_offset_ms: offset,
      duration_ms: duration,
    });
    console.log(`media: ${result.id} (${result.path})`);
    process.exit(0);
  }

  if (command === 'media' && subcommand === 'add-review-audio') {
    const targetDir = rest[0];
    if (!targetDir) {
      console.error('error: missing <dir> for media add-review-audio');
      printUsage();
      process.exit(1);
    }

    const source = getFlagValue(rest, '--source');
    if (!source) {
      console.error('error: missing --source for media add-review-audio');
      printUsage();
      process.exit(1);
    }

    const result = await addReviewAudio(targetDir, source);
    console.log(`media: ${result.id} (${result.path})`);
    process.exit(0);
  }

  if (command === 'midi' && subcommand === 'listen') {
    const sessionDir = rest[0];
    if (!sessionDir) {
      console.error('error: missing <dir> for midi listen');
      printUsage();
      process.exit(1);
    }

    const portStr = getFlagValue(rest, '--port');
    const portIndex = portStr !== undefined ? parseNonNegativeInt(portStr, 'port') : 0;

    const report = await validateSessionDir(sessionDir);
    if (!report.ok) {
      for (const issue of report.issues) {
        console.error(`error: ${issue.file}: ${issue.message}`);
      }
      process.exit(1);
    }

    const sessionPath = `${sessionDir}/session.json`;
    let session: Record<string, unknown>;
    try {
      const raw = await readFile(sessionPath, 'utf8');
      session = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      console.error('error: could not read session.json');
      process.exit(1);
    }
    const status = session.status as string | undefined;
    if (status !== 'active') {
      console.error(`warning: session status is "${status ?? 'unknown'}"; expected "active" for live markers. Listening anyway.`);
    }

    const portNames = getInputPortNames();
    if (portNames.length === 0) {
      console.error('error: no MIDI input ports found (macOS: CoreMIDI; Windows: MIDI API). Connect a device or create a virtual port.');
      process.exit(1);
    }
    if (portIndex >= portNames.length) {
      console.error(`error: port index ${portIndex} out of range (0–${portNames.length - 1}). Ports: ${portNames.map((n, i) => `${i}: ${n}`).join(', ')}`);
      process.exit(1);
    }

    console.error(`listening for MIDI CC on port ${portIndex}: ${portNames[portIndex]}. Session: ${sessionDir}. Ctrl+C to stop.`);
    const stop = createMidiListener({ portIndex, onCC: () => {}, log: true });
    process.on('SIGINT', () => {
      stop();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      stop();
      process.exit(0);
    });
    // Keep process alive
    await new Promise<void>(() => {});
  }

  if (command === 'transcribe') {
    const targetDir = subcommand;
    if (!targetDir) {
      console.error('error: missing <dir> for transcribe');
      printUsage();
      process.exit(1);
    }

    const importPath = getFlagValue(rest, '--file');
    const text = getFlagValue(rest, '--text');
    const offset = getFlagValue(rest, '--offset');
    const duration = getFlagValue(rest, '--duration');

    const result = await transcribeSession(targetDir, {
      importPath: importPath ?? undefined,
      text: text ?? undefined,
      offset_ms: offset ? parseNonNegativeInt(offset, 'offset') : undefined,
      duration_ms: duration ? parseNonNegativeInt(duration, 'duration') : undefined,
    });
    console.log(`transcribed: ${result.transcriptPath}`);
    process.exit(0);
  }

  if (command === 'mark') {
    const targetDir = subcommand;
    if (!targetDir) {
      console.error('error: missing <dir> for mark');
      printUsage();
      process.exit(1);
    }

    const offset = parseNonNegativeInt(getFlagValue(rest, '--offset'), 'offset');
    const label = getFlagValue(rest, '--label');
    const note = getFlagValue(rest, '--note');
    const tags = getFlagValues(rest, '--tag');
    const voiceNoteId = getFlagValue(rest, '--voice-note-id');

    const id = await addMarker(targetDir, {
      offset_ms: offset,
      label,
      note,
      tags,
      voice_note_id: voiceNoteId ?? undefined,
    });
    console.log(`marker: ${id}`);
    process.exit(0);
  }

  if (command === 'markers' && subcommand === 'list') {
    const targetDir = rest[0];
    if (!targetDir) {
      console.error('error: missing <dir> for markers list');
      printUsage();
      process.exit(1);
    }

    const tag = getFlagValue(rest, '--tag');
    const offsetMin = getFlagValue(rest, '--offset-min');
    const offsetMax = getFlagValue(rest, '--offset-max');

    const options = {
      tag: tag ?? undefined,
      offset_min_ms: offsetMin !== undefined ? parseNonNegativeInt(offsetMin, 'offset-min') : undefined,
      offset_max_ms: offsetMax !== undefined ? parseNonNegativeInt(offsetMax, 'offset-max') : undefined,
    };

    const entries = await listMarkers(targetDir, options);
    if (entries.length === 0) {
      console.log('no markers');
    } else {
      for (const entry of entries) {
        console.log(formatMarkerEntry(entry));
      }
    }
    process.exit(0);
  }

  if (command === 'voice-note') {
    const targetDir = subcommand;
    if (!targetDir) {
      console.error('error: missing <dir> for voice-note');
      printUsage();
      process.exit(1);
    }

    const offset = parseNonNegativeInt(getFlagValue(rest, '--offset'), 'offset');
    const duration = parseNonNegativeInt(getFlagValue(rest, '--duration'), 'duration');
    const media = getFlagValue(rest, '--media');
    const mediaFile = getFlagValue(rest, '--media-file');
    const text = getFlagValue(rest, '--text');
    const markerId = getFlagValue(rest, '--marker-id');

    if (!media && !mediaFile) {
      throw new Error('missing --media <filename> or --media-file <path>');
    }
    if (media && mediaFile) {
      throw new Error('use either --media or --media-file, not both');
    }

    const id = await addVoiceNote(targetDir, {
      offset_ms: offset,
      duration_ms: duration,
      media_filename: media ?? undefined,
      media_file_path: mediaFile ?? undefined,
      transcript_text: text,
      marker_id: markerId ?? undefined,
    });
    console.log(`voice-note: ${id}`);
    process.exit(0);
  }

  if (command === 'digest' && subcommand === 'write') {
    const targetDir = rest[0];
    if (!targetDir) {
      console.error('error: missing <dir> for digest write');
      printUsage();
      process.exit(1);
    }

    const filePath = getFlagValue(rest, '--file');
    if (!filePath) {
      throw new Error('missing --file path');
    }

    const content = await readFile(filePath, 'utf8');
    await writeDigest(targetDir, content);
    console.log('digest: updated');
    process.exit(0);
  }

  if (command === 'digest' && subcommand === 'read') {
    const targetDir = rest[0];
    if (!targetDir) {
      console.error('error: missing <dir> for digest read');
      printUsage();
      process.exit(1);
    }

    const content = await readDigest(targetDir);
    if (content === null) {
      console.log('no digest');
    } else {
      process.stdout.write(content);
    }
    process.exit(0);
  }

  if (command === 'action' && subcommand === 'run') {
    const targetDir = rest[0];
    const actionId = rest[1];
    if (!targetDir || !actionId) {
      console.error('error: missing <dir> or <action-id> for action run');
      printUsage();
      process.exit(1);
    }

    const inputPairs = getFlagValues(rest, '--input');
    const inputs: Record<string, string> = {};
    for (const pair of inputPairs) {
      const eq = pair.indexOf('=');
      if (eq > 0) {
        inputs[pair.slice(0, eq)] = pair.slice(eq + 1);
      }
    }

    try {
      const result = await runAction(targetDir, actionId, inputs);
      if (result.status === 'succeeded') {
        console.log(`action: ${actionId} succeeded (${result.id})`);
        process.exit(0);
      } else {
        console.error(`action: ${actionId} failed (${result.id})`);
        process.exit(1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`error: ${message}`);
      process.exit(1);
    }
  }

  if (command === 'validate') {
    const targetDir = subcommand;
    if (!targetDir) {
      console.error('error: missing <dir> for validate');
      printUsage();
      process.exit(1);
    }
    process.exit(await runValidateSession(targetDir));
  }

  if (command === 'validate-fixtures') {
    process.exit(await runValidateFixtures());
  }

  console.error(`error: unknown command: ${args.join(' ')}`);
  printUsage();
  process.exit(1);
}

main().catch((error) => {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
