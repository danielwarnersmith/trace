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

    const mediaDir = path.join(sessionDir, 'media');
    await mkdir(mediaDir, { recursive: true });
    await writeFile(path.join(mediaDir, 'note.m4a'), 'voice', 'utf8');

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

    const mediaDir = path.join(sessionDir, 'media');
    await mkdir(mediaDir, { recursive: true });
    await writeFile(
      path.join(mediaDir, '01J9Z2J8G8QK7F4M1N1E5J3Z7N.m4a'),
      'audio',
      'utf8',
    );

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

    const mediaDir = path.join(sessionDir, 'media');
    await mkdir(mediaDir, { recursive: true });
    await writeFile(path.join(mediaDir, 'note.m4a'), 'voice', 'utf8');

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

test('cli session show after init includes id status start_time', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);

    const result = await runCli(['session', 'show', sessionDir]);
    assert.equal(result.code, 0, result.stderr);
    assert.ok(result.stdout.includes('id:'), result.stdout);
    assert.ok(result.stdout.includes('status: active'), result.stdout);
    assert.ok(result.stdout.includes('start_time:'), result.stdout);
  });
});

test('cli session show after media and marker includes media_count and marker_count', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);

    const mediaFile = path.join(base, 'audio.m4a');
    await writeFile(mediaFile, 'audio', 'utf8');
    await runCli([
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
    await runCli(['mark', sessionDir, '--offset', '500', '--label', 'Intro']);

    const result = await runCli(['session', 'show', sessionDir]);
    assert.equal(result.code, 0, result.stderr);
    assert.ok(result.stdout.includes('media_count: 1'), result.stdout);
    assert.ok(result.stdout.includes('marker_count: 1'), result.stdout);
  });
});

test('cli session show invalid dir exits non-zero', async () => {
  await withTempDir(async (base) => {
    const badDir = path.join(base, 'nonexistent');
    const result = await runCli(['session', 'show', badDir]);
    assert.equal(result.code, 1);
    assert.ok(result.stderr.length > 0, result.stderr);
  });
});

test('cli markers list after adding markers shows id and offset', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);
    await runCli(['mark', sessionDir, '--offset', '100', '--label', 'A']);
    await runCli(['mark', sessionDir, '--offset', '200', '--label', 'B', '--tag', 'practice']);

    const result = await runCli(['markers', 'list', sessionDir]);
    assert.equal(result.code, 0, result.stderr);
    assert.ok(result.stdout.includes('100'), result.stdout);
    assert.ok(result.stdout.includes('200'), result.stdout);
    assert.ok(result.stdout.includes('A'), result.stdout);
    assert.ok(result.stdout.includes('B'), result.stdout);
  });
});

test('cli markers list empty produces no markers', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);

    const result = await runCli(['markers', 'list', sessionDir]);
    assert.equal(result.code, 0, result.stderr);
    assert.ok(result.stdout.includes('no markers'), result.stdout);
  });
});

test('cli markers list --tag filters by tag', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);
    await runCli(['mark', sessionDir, '--offset', '100', '--tag', 'warmup']);
    await runCli(['mark', sessionDir, '--offset', '200', '--tag', 'practice']);

    const result = await runCli(['markers', 'list', sessionDir, '--tag', 'warmup']);
    assert.equal(result.code, 0, result.stderr);
    assert.ok(result.stdout.includes('100'), result.stdout);
    assert.equal((result.stdout.match(/100/g) ?? []).length, 1);
  });
});

test('cli digest read after write returns content', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);
    const digestFile = path.join(base, 'digest.md');
    const content = '# Session notes\n\nKey moment at 1:20.';
    await writeFile(digestFile, content, 'utf8');
    await runCli(['digest', 'write', sessionDir, '--file', digestFile]);

    const result = await runCli(['digest', 'read', sessionDir]);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stdout, content);
  });
});

test('cli digest read no digest prints no digest', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);

    const result = await runCli(['digest', 'read', sessionDir]);
    assert.equal(result.code, 0, result.stderr);
    assert.ok(result.stdout.includes('no digest'), result.stdout);
  });
});

test('cli digest generate produces digest from session data', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);
    await runCli(['mark', sessionDir, '--offset', '5000', '--tag', 'highlight']);

    const genResult = await runCli(['digest', 'generate', sessionDir]);
    assert.equal(genResult.code, 0, genResult.stderr);
    assert.ok(genResult.stdout.includes('digest: updated'), genResult.stdout);

    const readResult = await runCli(['digest', 'read', sessionDir]);
    assert.equal(readResult.code, 0, readResult.stderr);
    assert.ok(readResult.stdout.includes('# Session digest'), readResult.stdout);
    assert.ok(readResult.stdout.includes('1') && readResult.stdout.includes('Markers'), readResult.stdout);
    assert.ok(readResult.stdout.includes('Recent actions'), readResult.stdout);
  });
});

test('cli voice-note set-transcript updates transcript_text', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);
    const mediaDir = path.join(sessionDir, 'media');
    await mkdir(mediaDir, { recursive: true });
    await writeFile(path.join(mediaDir, 'note.m4a'), 'audio', 'utf8');
    const voiceResult = await runCli([
      'voice-note',
      sessionDir,
      '--offset',
      '0',
      '--duration',
      '1000',
      '--media',
      'note.m4a',
    ]);
    assert.equal(voiceResult.code, 0, voiceResult.stderr);
    const voiceNoteIdMatch = voiceResult.stdout.match(/voice-note: ([A-HJKMNP-TV-Z0-9]{26})/);
    assert.ok(voiceNoteIdMatch, voiceResult.stdout);
    const voiceNoteId = voiceNoteIdMatch![1];

    const setResult = await runCli([
      'voice-note',
      'set-transcript',
      sessionDir,
      voiceNoteId,
      '--text',
      'Hello world',
    ]);
    assert.equal(setResult.code, 0, setResult.stderr);
    assert.ok(setResult.stdout.includes('transcript: updated'), setResult.stdout);

    const voiceNotesRaw = await readFile(path.join(sessionDir, 'voice_notes.jsonl'), 'utf8');
    const voiceNote = JSON.parse(voiceNotesRaw.trim().split('\n')[0]) as Record<string, unknown>;
    assert.equal(voiceNote.transcript_text, 'Hello world');

    const validateResult = await runCli(['validate', sessionDir]);
    assert.equal(validateResult.code, 0, validateResult.stderr);
  });
});

test('cli jobs add and jobs process run transcribe_voice_note job', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);
    const mediaDir = path.join(sessionDir, 'media');
    await mkdir(mediaDir, { recursive: true });
    await writeFile(path.join(mediaDir, 'note.m4a'), 'audio', 'utf8');
    const voiceResult = await runCli([
      'voice-note',
      sessionDir,
      '--offset',
      '0',
      '--duration',
      '1000',
      '--media',
      'note.m4a',
    ]);
    assert.equal(voiceResult.code, 0, voiceResult.stderr);
    const voiceNoteIdMatch = voiceResult.stdout.match(/voice-note: ([A-HJKMNP-TV-Z0-9]{26})/);
    assert.ok(voiceNoteIdMatch, voiceResult.stdout);
    const voiceNoteId = voiceNoteIdMatch![1];

    const addResult = await runCli([
      'jobs',
      'add',
      sessionDir,
      'transcribe_voice_note',
      '--voice-note-id',
      voiceNoteId,
    ]);
    assert.equal(addResult.code, 0, addResult.stderr);
    assert.ok(addResult.stdout.includes('job:'), addResult.stdout);

    const processResult = await runCli(['jobs', 'process', sessionDir]);
    assert.equal(processResult.code, 0, processResult.stderr);
    assert.ok(processResult.stdout.includes('processed: 1'), processResult.stdout);

    const voiceNotesRaw = await readFile(path.join(sessionDir, 'voice_notes.jsonl'), 'utf8');
    const voiceNote = JSON.parse(voiceNotesRaw.trim().split('\n')[0]) as Record<string, unknown>;
    assert.equal(voiceNote.transcript_text, '[transcribed]');
  });
});

test('cli voice-note --marker-id sets marker_id and updates marker voice_note_id', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);
    const markResult = await runCli([
      'mark',
      sessionDir,
      '--offset',
      '1000',
      '--label',
      'Checkpoint',
    ]);
    assert.equal(markResult.code, 0, markResult.stderr);
    const markerIdMatch = markResult.stdout.match(/marker: ([A-HJKMNP-TV-Z0-9]{26})/);
    assert.ok(markerIdMatch, markResult.stdout);
    const markerId = markerIdMatch![1];

    const mediaDir = path.join(sessionDir, 'media');
    await mkdir(mediaDir, { recursive: true });
    await writeFile(path.join(mediaDir, 'note.m4a'), 'voice', 'utf8');
    const voiceResult = await runCli([
      'voice-note',
      sessionDir,
      '--offset',
      '1000',
      '--duration',
      '2000',
      '--media',
      'note.m4a',
      '--marker-id',
      markerId,
    ]);
    assert.equal(voiceResult.code, 0, voiceResult.stderr);
    const voiceNoteIdMatch = voiceResult.stdout.match(/voice-note: ([A-HJKMNP-TV-Z0-9]{26})/);
    assert.ok(voiceNoteIdMatch, voiceResult.stdout);
    const voiceNoteId = voiceNoteIdMatch![1];

    const voiceNotesRaw = await readFile(path.join(sessionDir, 'voice_notes.jsonl'), 'utf8');
    const voiceNoteLine = voiceNotesRaw.trim().split('\n').pop()!;
    const voiceNote = JSON.parse(voiceNoteLine) as Record<string, unknown>;
    assert.equal(voiceNote.marker_id, markerId);

    const markersRaw = await readFile(path.join(sessionDir, 'markers.jsonl'), 'utf8');
    const markerLines = markersRaw.trim().split('\n').filter(Boolean);
    const lastMarkerLine = markerLines[markerLines.length - 1];
    const lastMarker = JSON.parse(lastMarkerLine) as Record<string, unknown>;
    assert.equal(lastMarker.voice_note_id, voiceNoteId);

    const validateResult = await runCli(['validate', sessionDir]);
    assert.equal(validateResult.code, 0, validateResult.stderr);
  });
});

test('cli voice-note invalid --marker-id exits non-zero', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);
    const mediaDir = path.join(sessionDir, 'media');
    await mkdir(mediaDir, { recursive: true });
    await writeFile(path.join(mediaDir, 'note.m4a'), 'voice', 'utf8');

    const result = await runCli([
      'voice-note',
      sessionDir,
      '--offset',
      '0',
      '--duration',
      '1000',
      '--media',
      'note.m4a',
      '--marker-id',
      '01J9Z2J8G8QK7F4M1N1E5J3Z7X',
    ]);
    assert.equal(result.code, 1);
    assert.ok(result.stderr.includes('marker_id not found') || result.stderr.includes('error'), result.stderr);
  });
});

test('cli mark --voice-note-id sets voice_note_id on marker', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);
    const mediaDir = path.join(sessionDir, 'media');
    await mkdir(mediaDir, { recursive: true });
    await writeFile(path.join(mediaDir, 'note.m4a'), 'voice', 'utf8');
    const voiceResult = await runCli([
      'voice-note',
      sessionDir,
      '--offset',
      '500',
      '--duration',
      '1500',
      '--media',
      'note.m4a',
    ]);
    assert.equal(voiceResult.code, 0, voiceResult.stderr);
    const voiceNoteIdMatch = voiceResult.stdout.match(/voice-note: ([A-HJKMNP-TV-Z0-9]{26})/);
    assert.ok(voiceNoteIdMatch, voiceResult.stdout);
    const voiceNoteId = voiceNoteIdMatch![1];

    const markResult = await runCli([
      'mark',
      sessionDir,
      '--offset',
      '500',
      '--label',
      'Linked',
      '--voice-note-id',
      voiceNoteId,
    ]);
    assert.equal(markResult.code, 0, markResult.stderr);

    const markersRaw = await readFile(path.join(sessionDir, 'markers.jsonl'), 'utf8');
    const lastMarkerLine = markersRaw.trim().split('\n').filter(Boolean).pop()!;
    const marker = JSON.parse(lastMarkerLine) as Record<string, unknown>;
    assert.equal(marker.voice_note_id, voiceNoteId);

    const validateResult = await runCli(['validate', sessionDir]);
    assert.equal(validateResult.code, 0, validateResult.stderr);
  });
});

test('cli mark invalid --voice-note-id exits non-zero', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);

    const result = await runCli([
      'mark',
      sessionDir,
      '--offset',
      '0',
      '--voice-note-id',
      '01J9Z2J8G8QK7F4M1N1E5J3Z7X',
    ]);
    assert.equal(result.code, 1);
    assert.ok(result.stderr.includes('voice_note_id not found') || result.stderr.includes('error'), result.stderr);
  });
});

test('cli action run unknown action exits non-zero and writes actions.jsonl', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);

    const result = await runCli(['action', 'run', sessionDir, 'unknown_action']);
    assert.equal(result.code, 1);
    assert.ok(result.stderr.includes('unknown action') || result.stderr.includes('error'), result.stderr);

    const actionsPath = path.join(sessionDir, 'actions.jsonl');
    const content = await readFile(actionsPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    assert.ok(lines.length >= 2, 'expected at least started and failed entries');
    const started = JSON.parse(lines[0]) as Record<string, unknown>;
    const failed = JSON.parse(lines[lines.length - 1]) as Record<string, unknown>;
    assert.equal(started.status, 'started');
    assert.equal(started.action, 'unknown_action');
    assert.equal(failed.status, 'failed');
    assert.equal(failed.action, 'unknown_action');
  });
});

test('cli action run creates actions.jsonl on first run', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);

    await runCli(['action', 'run', sessionDir, 'nonexistent_action']);

    const actionsPath = path.join(sessionDir, 'actions.jsonl');
    const content = await readFile(actionsPath, 'utf8');
    assert.ok(content.length > 0);
    const lines = content.trim().split('\n').filter(Boolean);
    assert.ok(lines.length >= 1);
  });
});

test('action run entries validate against actions schema', async () => {
  const { validateJson } = await import('../src/validation/validator.js');
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);
    await runCli(['action', 'run', sessionDir, 'unknown_action']);

    const actionsPath = path.join(sessionDir, 'actions.jsonl');
    const content = await readFile(actionsPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      const entry = JSON.parse(line) as unknown;
      const result = await validateJson('actions', entry);
      assert.equal(result.ok, true, `actions schema: ${JSON.stringify(result.errors)}`);
    }
  });
});

test('cli voice-note --media-file copies file to media and sets media_path', async () => {
  await withTempDir(async (base) => {
    const sessionDir = path.join(base, 'session');
    await runCli(['session', 'init', sessionDir]);
    const recordingPath = path.join(base, 'recording.m4a');
    await writeFile(recordingPath, 'voice recording content', 'utf8');

    const result = await runCli([
      'voice-note',
      sessionDir,
      '--offset',
      '0',
      '--duration',
      '3000',
      '--media-file',
      recordingPath,
    ]);
    assert.equal(result.code, 0, result.stderr);
    const voiceNoteIdMatch = result.stdout.match(/voice-note: ([A-HJKMNP-TV-Z0-9]{26})/);
    assert.ok(voiceNoteIdMatch, result.stdout);
    const voiceNoteId = voiceNoteIdMatch![1];

    const voiceNotesRaw = await readFile(path.join(sessionDir, 'voice_notes.jsonl'), 'utf8');
    const voiceNoteLine = voiceNotesRaw.trim().split('\n').pop()!;
    const voiceNote = JSON.parse(voiceNoteLine) as Record<string, unknown>;
    assert.equal(voiceNote.media_path, `media/${voiceNoteId}.m4a`);

    const mediaPath = path.join(sessionDir, 'media', `${voiceNoteId}.m4a`);
    const mediaContent = await readFile(mediaPath, 'utf8');
    assert.equal(mediaContent, 'voice recording content');

    const validateResult = await runCli(['validate', sessionDir]);
    assert.equal(validateResult.code, 0, validateResult.stderr);
  });
});
