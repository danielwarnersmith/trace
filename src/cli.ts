#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { initSession } from './commands/session-init.js';
import { addMarker, addVoiceNote } from './commands/mark.js';
import { addMedia } from './commands/media.js';
import { transcribeSession } from './commands/transcribe.js';
import { writeDigest } from './commands/digest.js';
import { validateSessionDir } from './commands/validate-session.js';
import { validateAllFixtures } from './validation/fixtures.js';

const usage = `TRACE CLI

Usage:
  trace session init <dir>
  trace media add <dir> --file <path> --kind <kind> --mime <mime> --offset <ms> [--duration <ms>]
  trace transcribe <dir> --file <path> | --text <text> [--offset <ms>] [--duration <ms>]
  trace mark <dir> --offset <ms> [--label <label>] [--note <text>] [--tag <tag> ...]
  trace voice-note <dir> --offset <ms> --duration <ms> --media <filename> [--text <text>]
  trace digest write <dir> --file <path>
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

    const id = await addMarker(targetDir, { offset_ms: offset, label, note, tags });
    console.log(`marker: ${id}`);
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
    const text = getFlagValue(rest, '--text');

    if (!media) {
      throw new Error('missing media filename');
    }

    const id = await addVoiceNote(targetDir, {
      offset_ms: offset,
      duration_ms: duration,
      media_filename: media,
      transcript_text: text,
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
