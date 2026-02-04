import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ulid } from 'ulid';

export type CloseResult = {
  end_time: string;
  duration_ms: number;
};

function nowIso(): string {
  return new Date().toISOString();
}

function parseStartTime(startTime: string): number {
  const ms = Date.parse(startTime);
  if (Number.isNaN(ms)) {
    throw new Error('invalid session start_time');
  }
  return ms;
}

export async function closeSession(sessionDir: string): Promise<CloseResult> {
  const resolvedDir = path.resolve(sessionDir);
  const sessionPath = path.join(resolvedDir, 'session.json');
  const timelinePath = path.join(resolvedDir, 'timeline.jsonl');

  await access(sessionPath);
  await access(timelinePath);

  const raw = await readFile(sessionPath, 'utf8');
  const session = JSON.parse(raw) as Record<string, unknown>;

  if (session.status === 'closed') {
    throw new Error('session already closed');
  }

  if (typeof session.start_time !== 'string') {
    throw new Error('session start_time missing');
  }

  const endTime = nowIso();
  const durationMs = Math.max(0, Date.parse(endTime) - parseStartTime(session.start_time));

  const endEntry = {
    id: ulid(),
    kind: 'session_end',
    offset_ms: durationMs,
    wall_time: endTime,
    created_at: endTime,
    source: 'system',
  };

  await writeFile(timelinePath, `${JSON.stringify(endEntry)}\n`, { flag: 'a' });

  const updated = {
    ...session,
    status: 'closed',
    end_time: endTime,
    duration_ms: durationMs,
    updated_at: endTime,
  };

  await writeFile(sessionPath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');

  return { end_time: endTime, duration_ms: durationMs };
}
