import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ulid } from 'ulid';

export type MediaInput = {
  filePath: string;
  kind: 'audio' | 'video' | 'screen' | 'other';
  mime: string;
  start_offset_ms: number;
  duration_ms?: number;
};

export type MediaResult = {
  id: string;
  path: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

async function readSession(sessionPath: string): Promise<Record<string, unknown>> {
  const raw = await readFile(sessionPath, 'utf8');
  return JSON.parse(raw) as Record<string, unknown>;
}

async function writeSession(sessionPath: string, session: Record<string, unknown>): Promise<void> {
  await writeFile(sessionPath, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
}

function wallTimeFromOffset(startTime: string, offsetMs: number): string {
  const base = new Date(startTime);
  if (Number.isNaN(base.getTime())) {
    throw new Error('invalid session start_time');
  }
  const time = new Date(base.getTime() + offsetMs);
  return time.toISOString();
}

export async function addMedia(sessionDir: string, input: MediaInput): Promise<MediaResult> {
  const resolvedDir = path.resolve(sessionDir);
  const sessionPath = path.join(resolvedDir, 'session.json');
  const timelinePath = path.join(resolvedDir, 'timeline.jsonl');

  await access(sessionPath);
  await access(timelinePath);
  await access(input.filePath);

  await mkdir(path.join(resolvedDir, 'media'), { recursive: true });

  const id = ulid();
  const ext = path.extname(input.filePath);
  const relPath = `media/${id}${ext}`;
  const destPath = path.join(resolvedDir, relPath);

  await copyFile(input.filePath, destPath);

  const createdAt = nowIso();
  const session = await readSession(sessionPath);
  const media = Array.isArray(session.media) ? [...session.media] : [];

  const mediaEntry = {
    id,
    kind: input.kind,
    path: relPath,
    mime: input.mime,
    created_at: createdAt,
    start_offset_ms: input.start_offset_ms,
    ...(input.duration_ms !== undefined ? { duration_ms: input.duration_ms } : {}),
  };

  media.push(mediaEntry);
  session.media = media;
  session.updated_at = createdAt;

  const startTime = session.start_time;
  if (typeof startTime !== 'string') {
    throw new Error('session start_time missing');
  }

  const mediaStart = {
    id: ulid(),
    kind: 'media_start',
    offset_ms: input.start_offset_ms,
    wall_time: wallTimeFromOffset(startTime, input.start_offset_ms),
    created_at: createdAt,
    source: 'system',
  };

  let timelineEntries = `${JSON.stringify(mediaStart)}\n`;

  if (input.duration_ms !== undefined) {
    const endOffset = input.start_offset_ms + input.duration_ms;
    const mediaEnd = {
      id: ulid(),
      kind: 'media_end',
      offset_ms: endOffset,
      wall_time: wallTimeFromOffset(startTime, endOffset),
      created_at: createdAt,
      source: 'system',
    };
    timelineEntries += `${JSON.stringify(mediaEnd)}\n`;
  }

  await writeFile(timelinePath, timelineEntries, { flag: 'a' });
  await writeSession(sessionPath, session);

  return { id, path: relPath };
}
