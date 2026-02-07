import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

export type SessionShowResult = {
  id: string;
  status: string;
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  timeline_path: string;
  markers_path: string;
  transcript_path: string | null;
  voice_notes_path: string | null;
  digest_path: string | null;
  media_count: number;
  marker_count: number;
};

async function countJsonlLines(filePath: string): Promise<number> {
  try {
    const content = await readFile(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
    return lines.length;
  } catch {
    return 0;
  }
}

export async function showSession(sessionDir: string): Promise<SessionShowResult> {
  const resolvedDir = path.resolve(sessionDir);
  const sessionPath = path.join(resolvedDir, 'session.json');

  await access(sessionPath);

  const raw = await readFile(sessionPath, 'utf8');
  const session = JSON.parse(raw) as Record<string, unknown>;

  const id = session.id as string;
  const status = session.status as string;
  const start_time = session.start_time as string;
  const end_time = session.end_time as string | undefined;
  const duration_ms = session.duration_ms as number | undefined;
  const timeline_path = (session.timeline_path as string) ?? 'timeline.jsonl';
  const markers_path = (session.markers_path as string) ?? 'markers.jsonl';
  const transcript_path = session.transcript_path as string | null ?? null;
  const voice_notes_path = session.voice_notes_path as string | null ?? null;
  const digest_path = session.digest_path as string | null ?? null;
  const media = Array.isArray(session.media) ? session.media : [];
  const media_count = media.length;

  const markersPath = path.join(resolvedDir, markers_path);
  const marker_count = await countJsonlLines(markersPath);

  return {
    id,
    status,
    start_time,
    end_time,
    duration_ms,
    timeline_path,
    markers_path,
    transcript_path,
    voice_notes_path,
    digest_path,
    media_count,
    marker_count,
  };
}

export function formatSessionShow(result: SessionShowResult): string {
  const lines: string[] = [
    `id: ${result.id}`,
    `status: ${result.status}`,
    `start_time: ${result.start_time}`,
  ];
  if (result.end_time !== undefined) {
    lines.push(`end_time: ${result.end_time}`);
  }
  if (result.duration_ms !== undefined) {
    lines.push(`duration_ms: ${result.duration_ms}`);
  }
  lines.push(
    `timeline_path: ${result.timeline_path}`,
    `markers_path: ${result.markers_path}`,
    `transcript_path: ${result.transcript_path ?? 'null'}`,
    `voice_notes_path: ${result.voice_notes_path ?? 'null'}`,
    `digest_path: ${result.digest_path ?? 'null'}`,
    `media_count: ${result.media_count}`,
    `marker_count: ${result.marker_count}`,
  );
  return lines.join('\n');
}
