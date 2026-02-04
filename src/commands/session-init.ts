import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { ulid } from 'ulid';

export type InitResult = {
  sessionId: string;
  sessionDir: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

async function ensureDoesNotExist(target: string): Promise<void> {
  try {
    await access(target);
    throw new Error(`target already exists: ${target}`);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
}

export async function initSession(sessionDir: string): Promise<InitResult> {
  const resolvedDir = path.resolve(sessionDir);
  await ensureDoesNotExist(resolvedDir);

  await mkdir(resolvedDir, { recursive: false });

  const createdAt = nowIso();
  const sessionId = ulid();

  const session = {
    id: sessionId,
    title: '',
    created_at: createdAt,
    updated_at: createdAt,
    status: 'active',
    start_time: createdAt,
    timeline_path: 'timeline.jsonl',
    markers_path: 'markers.jsonl',
    transcript_path: null,
    voice_notes_path: null,
    digest_path: null,
    media: [] as unknown[],
  };

  const timelineEntry = {
    id: ulid(),
    kind: 'session_start',
    offset_ms: 0,
    wall_time: createdAt,
    created_at: createdAt,
    source: 'system',
  };

  await writeFile(
    path.join(resolvedDir, 'session.json'),
    `${JSON.stringify(session, null, 2)}\n`,
    'utf8',
  );
  await writeFile(
    path.join(resolvedDir, 'timeline.jsonl'),
    `${JSON.stringify(timelineEntry)}\n`,
    'utf8',
  );
  await writeFile(path.join(resolvedDir, 'markers.jsonl'), '', 'utf8');
  await mkdir(path.join(resolvedDir, 'media'), { recursive: false });

  return { sessionId, sessionDir: resolvedDir };
}
