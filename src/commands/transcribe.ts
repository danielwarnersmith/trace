import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ulid } from 'ulid';
import { formatAjvErrors, validateJson } from '../validation/validator.js';

export type TranscribeOptions = {
  importPath?: string;
  text?: string;
  offset_ms?: number;
  duration_ms?: number;
};

export type TranscribeResult = {
  transcriptPath: string;
};

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

type Session = {
  media?: Array<{ kind?: string }>;
};

function parseJsonLines(content: string): unknown[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return lines.map((line, index) => {
    try {
      return JSON.parse(line) as unknown;
    } catch (error) {
      throw new Error(`invalid JSON on line ${index + 1}: ${(error as Error).message}`);
    }
  });
}

export async function transcribeSession(
  sessionDir: string,
  options: TranscribeOptions = {},
): Promise<TranscribeResult> {
  const resolvedDir = path.resolve(sessionDir);
  const sessionPath = path.join(resolvedDir, 'session.json');
  if (!(await exists(sessionPath))) {
    throw new Error('session.json not found');
  }

  const sessionRaw = await readFile(sessionPath, 'utf8');
  const session = JSON.parse(sessionRaw) as Session;
  const media = session.media ?? [];

  const hasAudio = media.some((item) => item.kind === 'audio' || item.kind === 'video');
  if (!hasAudio) {
    throw new Error('no audio/video media available for transcription');
  }

  const transcriptPath = path.join(resolvedDir, 'transcript.jsonl');

  if (options.importPath) {
    const raw = await readFile(options.importPath, 'utf8');
    const segments = parseJsonLines(raw);
    for (let i = 0; i < segments.length; i += 1) {
      const result = await validateJson('transcript', segments[i]);
      if (!result.ok) {
        throw new Error(`invalid transcript on line ${i + 1}: ${formatAjvErrors(result.errors)}`);
      }
    }
    let lastOffset = -Infinity;
    for (let i = 0; i < segments.length; i += 1) {
      const offset = (segments[i] as Record<string, unknown>).offset_ms;
      if (typeof offset === 'number') {
        if (offset < lastOffset) {
          throw new Error(`transcript offsets must be non-decreasing (line ${i + 1})`);
        }
        lastOffset = offset;
      }
    }
    await writeFile(transcriptPath, raw.trimEnd() + '\n', 'utf8');
  } else if (options.text !== undefined) {
    const segment = {
      id: ulid(),
      offset_ms: options.offset_ms ?? 0,
      duration_ms: options.duration_ms ?? 0,
      text: options.text,
    };
    await writeFile(transcriptPath, `${JSON.stringify(segment)}\n`, 'utf8');
  } else {
    throw new Error('missing --file or --text for transcribe');
  }

  const now = nowIso();
  const updated = {
    ...session,
    transcript_path: 'transcript.jsonl',
    transcribed_at: now,
    updated_at: now,
  };

  await writeFile(sessionPath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');

  return { transcriptPath };
}
