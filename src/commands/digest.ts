import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

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

export async function writeDigest(sessionDir: string, content: string): Promise<void> {
  const resolvedDir = path.resolve(sessionDir);
  const digestPath = path.join(resolvedDir, 'digest.md');
  const sessionPath = path.join(resolvedDir, 'session.json');

  await writeFile(digestPath, content, 'utf8');

  const session = await readSession(sessionPath);
  const now = nowIso();
  session.digest_path = 'digest.md';
  session.digest_updated_at = now;
  session.updated_at = now;
  await writeSession(sessionPath, session);
}
