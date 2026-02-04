import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { closeSession } from '../src/commands/session-close.js';
import { addMarker, addVoiceNote } from '../src/commands/mark.js';
import { writeDigest } from '../src/commands/digest.js';
import { initSession } from '../src/commands/session-init.js';
import { transcribeSession } from '../src/commands/transcribe.js';
import { validateSessionDir } from '../src/commands/validate-session.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cliPath = path.join(repoRoot, 'src', 'cli.ts');
const tsxBin = path.join(
  repoRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsx.cmd' : 'tsx',
);

type CliResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

async function runCli(args: string[], cwd = repoRoot): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(tsxBin, [cliPath, ...args], {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const base = await mkdtemp(path.join(os.tmpdir(), 'trace-'));
  try {
    return await fn(base);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
}

test('initSession creates required files and validates', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    const result = await initSession(sessionDir);

    assert.equal(result.sessionDir, sessionDir);

    const sessionRaw = await readFile(path.join(sessionDir, 'session.json'), 'utf8');
    const session = JSON.parse(sessionRaw) as { id?: string };
    assert.equal(typeof session.id, 'string');

    const report = await validateSessionDir(sessionDir);
    assert.equal(report.ok, true, JSON.stringify(report.issues, null, 2));
  });
});

test('validateSessionDir reports missing files', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await mkdir(sessionDir, { recursive: true });

    await writeFile(path.join(sessionDir, 'session.json'), '{}', 'utf8');

    const report = await validateSessionDir(sessionDir);
    assert.equal(report.ok, false);
    assert.ok(report.issues.some((issue) => issue.message.includes('missing file')));
  });
});

test('mark, voice-note, and digest update session data', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await initSession(sessionDir);

    const markerId = await addMarker(sessionDir, {
      offset_ms: 1200,
      label: 'Warmup',
      tags: ['practice'],
    });
    assert.equal(typeof markerId, 'string');

    const voiceNoteId = await addVoiceNote(sessionDir, {
      offset_ms: 2000,
      duration_ms: 3200,
      media_filename: 'note.m4a',
      transcript_text: 'Try softer attack.',
    });
    assert.equal(typeof voiceNoteId, 'string');

    await writeDigest(sessionDir, 'Digest note');

    const report = await validateSessionDir(sessionDir);
    assert.equal(report.ok, true, JSON.stringify(report.issues, null, 2));
  });
});

test('closeSession appends session_end and validates', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await initSession(sessionDir);

    const result = await closeSession(sessionDir);
    assert.ok(result.duration_ms >= 0);

    const report = await validateSessionDir(sessionDir);
    assert.equal(report.ok, true, JSON.stringify(report.issues, null, 2));
  });
});

test('transcribe requires audio media', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await initSession(sessionDir);

    await assert.rejects(
      () => transcribeSession(sessionDir, { text: 'Hello', offset_ms: 0, duration_ms: 0 }),
      /no audio\/video media/,
    );
  });
});

test('transcribe writes transcript when audio media exists', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await initSession(sessionDir);

    const sessionPath = path.join(sessionDir, 'session.json');
    const sessionRaw = await readFile(sessionPath, 'utf8');
    const session = JSON.parse(sessionRaw) as Record<string, unknown>;
    session.media = [
      {
        id: '01J9Z2J8G8QK7F4M1N1E5J3Z7N',
        kind: 'audio',
        path: 'media/01J9Z2J8G8QK7F4M1N1E5J3Z7N.m4a',
        mime: 'audio/mp4',
        created_at: '2026-02-04T12:00:00Z',
        start_offset_ms: 0,
      },
    ];

    await writeFile(sessionPath, `${JSON.stringify(session, null, 2)}\n`, 'utf8');

    const result = await transcribeSession(sessionDir, {
      text: "Let's take it from the top.",
      offset_ms: 0,
      duration_ms: 1800,
    });
    assert.equal(result.transcriptPath, path.join(sessionDir, 'transcript.jsonl'));

    const report = await validateSessionDir(sessionDir);
    assert.equal(report.ok, true, JSON.stringify(report.issues, null, 2));
  });
});

test('validateSessionDir flags ordering and referential issues', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await initSession(sessionDir);

    const sessionPath = path.join(sessionDir, 'session.json');
    const sessionRaw = await readFile(sessionPath, 'utf8');
    const session = JSON.parse(sessionRaw) as Record<string, unknown>;
    session.transcript_path = 'transcript.jsonl';
    session.voice_notes_path = 'voice_notes.jsonl';
    await writeFile(sessionPath, `${JSON.stringify(session, null, 2)}\n`, 'utf8');

    const transcriptPath = path.join(sessionDir, 'transcript.jsonl');
    const transcriptLines = [
      JSON.stringify({
        id: '01J9Z2R3YF8J5HPZ2E5Y2R1ZQA',
        offset_ms: 100,
        duration_ms: 10,
        text: 'First',
      }),
      JSON.stringify({
        id: '01J9Z2R3YF8J5HPZ2E5Y2R1ZQB',
        offset_ms: 50,
        duration_ms: 10,
        text: 'Second',
      }),
    ];
    await writeFile(transcriptPath, `${transcriptLines.join('\n')}\n`, 'utf8');

    const markersPath = path.join(sessionDir, 'markers.jsonl');
    await writeFile(
      markersPath,
      `${JSON.stringify({
        id: '01J9Z2R3YF8J5HPZ2E5Y2R1ZQC',
        offset_ms: 0,
        created_at: '2026-02-04T12:00:00Z',
        source: 'user',
        voice_note_id: '01J9Z2R3YF8J5HPZ2E5Y2R1ZQX',
      })}\n`,
      'utf8',
    );

    const voiceNotesPath = path.join(sessionDir, 'voice_notes.jsonl');
    await writeFile(
      voiceNotesPath,
      `${JSON.stringify({
        id: '01J9Z2R3YF8J5HPZ2E5Y2R1ZQD',
        created_at: '2026-02-04T12:00:05Z',
        media_path: 'media/missing-note.m4a',
        offset_ms: 0,
        duration_ms: 10,
        marker_id: '01J9Z2R3YF8J5HPZ2E5Y2R1ZQY',
      })}\n`,
      'utf8',
    );

    session.media = [
      {
        id: '01J9Z2R3YF8J5HPZ2E5Y2R1ZQE',
        kind: 'audio',
        path: 'media/missing.m4a',
        mime: 'audio/mp4',
        created_at: '2026-02-04T12:00:00Z',
        start_offset_ms: 0,
      },
    ];
    await writeFile(sessionPath, `${JSON.stringify(session, null, 2)}\n`, 'utf8');

    const report = await validateSessionDir(sessionDir);
    assert.equal(report.ok, false);
    const messages = report.issues.map((issue) => issue.message).join(' | ');
    assert.ok(messages.includes('transcript offset_ms out of order'), messages);
    assert.ok(messages.includes('marker voice_note_id not found'), messages);
    assert.ok(messages.includes('voice_note marker_id not found'), messages);
    assert.ok(messages.includes('voice_note media file missing'), messages);
    assert.ok(messages.includes('media file missing'), messages);
  });
});

test('cli session init and validate', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    const initResult = await runCli(['session', 'init', sessionDir]);
    assert.equal(initResult.code, 0, initResult.stderr);

    const validateResult = await runCli(['validate', sessionDir]);
    assert.equal(validateResult.code, 0, validateResult.stderr);
    assert.ok(validateResult.stdout.includes('ok:'), validateResult.stdout);
  });
});

test('cli session close', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);

    const closeResult = await runCli(['session', 'close', sessionDir]);
    assert.equal(closeResult.code, 0, closeResult.stderr);

    const validateResult = await runCli(['validate', sessionDir]);
    assert.equal(validateResult.code, 0, validateResult.stderr);
  });
});

test('cli mark, voice-note, and digest parse flags', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);

    const markResult = await runCli([
      'mark',
      sessionDir,
      '--offset',
      '1200',
      '--label',
      'Warmup',
      '--tag',
      'practice',
      '--tag',
      'take_1',
    ]);
    assert.equal(markResult.code, 0, markResult.stderr);

    const voiceResult = await runCli([
      'voice-note',
      sessionDir,
      '--offset',
      '2000',
      '--duration',
      '3200',
      '--media',
      'note.m4a',
      '--text',
      'Try softer attack.',
    ]);
    assert.equal(voiceResult.code, 0, voiceResult.stderr);

    const digestFile = path.join(base, 'digest.md');
    await writeFile(digestFile, 'Digest note', 'utf8');
    const digestResult = await runCli(['digest', 'write', sessionDir, '--file', digestFile]);
    assert.equal(digestResult.code, 0, digestResult.stderr);

    const validateResult = await runCli(['validate', sessionDir]);
    assert.equal(validateResult.code, 0, validateResult.stderr);
  });
});

test('cli transcribe fails without audio', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);

    const result = await runCli([
      'transcribe',
      sessionDir,
      '--text',
      'Hello',
      '--offset',
      '0',
      '--duration',
      '0',
    ]);
    assert.equal(result.code, 1);
    assert.ok(result.stderr.includes('no audio/video media'), result.stderr);
  });
});

test('cli transcribe succeeds with media', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);

    const mediaFile = path.join(base, 'audio.m4a');
    await writeFile(mediaFile, 'audio', 'utf8');

    const mediaResult = await runCli([
      'media',
      'add',
      sessionDir,
      '--file',
      mediaFile,
      '--kind',
      'audio',
      '--mime',
      'audio/mp4',
      '--offset',
      '0',
      '--duration',
      '1200',
    ]);
    assert.equal(mediaResult.code, 0, mediaResult.stderr);

    const result = await runCli([
      'transcribe',
      sessionDir,
      '--text',
      "Let's take it from the top.",
      '--offset',
      '0',
      '--duration',
      '1800',
    ]);
    assert.equal(result.code, 0, result.stderr);

    const validateResult = await runCli(['validate', sessionDir]);
    assert.equal(validateResult.code, 0, validateResult.stderr);
  });
});

test('cli transcribe accepts --file', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);

    const mediaFile = path.join(base, 'audio.m4a');
    await writeFile(mediaFile, 'audio', 'utf8');

    const mediaResult = await runCli([
      'media',
      'add',
      sessionDir,
      '--file',
      mediaFile,
      '--kind',
      'audio',
      '--mime',
      'audio/mp4',
      '--offset',
      '0',
    ]);
    assert.equal(mediaResult.code, 0, mediaResult.stderr);

    const transcriptFile = path.join(base, 'transcript.jsonl');
    const transcriptLine = JSON.stringify({
      id: '01J9Z2P2KM3QZ9Z1B1K2Q7Y2P8',
      offset_ms: 0,
      duration_ms: 1800,
      text: 'Line 1',
    });
    await writeFile(transcriptFile, `${transcriptLine}\n`, 'utf8');

    const result = await runCli(['transcribe', sessionDir, '--file', transcriptFile]);
    assert.equal(result.code, 0, result.stderr);

    const validateResult = await runCli(['validate', sessionDir]);
    assert.equal(validateResult.code, 0, validateResult.stderr);
  });
});
