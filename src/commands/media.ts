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

async function getLastTimelineOffset(timelinePath: string): Promise<number | null> {
  const content = await readFile(timelinePath, 'utf8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return null;
  }
  const lastLine = lines[lines.length - 1];
  const entry = JSON.parse(lastLine) as Record<string, unknown>;
  const offset = entry.offset_ms;
  if (typeof offset !== 'number') {
    throw new Error('invalid timeline entry offset_ms');
  }
  return offset;
}

export async function addMedia(sessionDir: string, input: MediaInput): Promise<MediaResult> {
  const resolvedDir = path.resolve(sessionDir);
  const sessionPath = path.join(resolvedDir, 'session.json');
  const timelinePath = path.join(resolvedDir, 'timeline.jsonl');

  await access(sessionPath);
  await access(timelinePath);
  await access(input.filePath);

  if (!Number.isFinite(input.start_offset_ms) || input.start_offset_ms < 0) {
    throw new Error('start_offset_ms must be a non-negative number');
  }
  if (input.duration_ms !== undefined && (!Number.isFinite(input.duration_ms) || input.duration_ms < 0)) {
    throw new Error('duration_ms must be a non-negative number');
  }

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

  const lastOffset = await getLastTimelineOffset(timelinePath);
  if (lastOffset !== null && input.start_offset_ms < lastOffset) {
    throw new Error('media start_offset_ms precedes last timeline offset');
  }

  if (session.status === 'closed' && typeof session.duration_ms === 'number') {
    const endOffset =
      input.duration_ms !== undefined
        ? input.start_offset_ms + input.duration_ms
        : input.start_offset_ms;
    if (input.start_offset_ms > session.duration_ms || endOffset > session.duration_ms) {
      throw new Error('media offsets exceed closed session duration');
    }
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
