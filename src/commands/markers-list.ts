import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

export type MarkerEntry = {
  id: string;
  offset_ms: number;
  label?: string;
  note?: string;
  tags?: string[];
  voice_note_id?: string;
};

export type ListMarkersOptions = {
  tag?: string;
  offset_min_ms?: number;
  offset_max_ms?: number;
};

function parseMarkersJsonl(content: string): MarkerEntry[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const byId = new Map<string, MarkerEntry>();
  for (const line of lines) {
    const obj = JSON.parse(line) as Record<string, unknown>;
    const id = obj.id as string;
    const offset_ms = typeof obj.offset_ms === 'number' ? obj.offset_ms : 0;
    const label = obj.label as string | undefined;
    const note = obj.note as string | undefined;
    const tags = Array.isArray(obj.tags) ? (obj.tags as string[]) : undefined;
    const voice_note_id = typeof obj.voice_note_id === 'string' ? obj.voice_note_id : undefined;
    byId.set(id, { id, offset_ms, label, note, tags, voice_note_id });
  }
  return Array.from(byId.values());
}

export async function listMarkers(
  sessionDir: string,
  options: ListMarkersOptions = {},
): Promise<MarkerEntry[]> {
  const resolvedDir = path.resolve(sessionDir);
  const sessionPath = path.join(resolvedDir, 'session.json');

  await access(sessionPath);

  const raw = await readFile(sessionPath, 'utf8');
  const session = JSON.parse(raw) as Record<string, unknown>;
  const markers_path = (session.markers_path as string) ?? 'markers.jsonl';
  const markersPath = path.join(resolvedDir, markers_path);

  let content: string;
  try {
    content = await readFile(markersPath, 'utf8');
  } catch {
    return [];
  }

  let entries = parseMarkersJsonl(content);

  if (options.tag !== undefined) {
    const tag = options.tag.toLowerCase();
    entries = entries.filter(
      (e) => Array.isArray(e.tags) && e.tags.some((t) => t.toLowerCase() === tag),
    );
  }
  if (options.offset_min_ms !== undefined) {
    entries = entries.filter((e) => e.offset_ms >= options.offset_min_ms!);
  }
  if (options.offset_max_ms !== undefined) {
    entries = entries.filter((e) => e.offset_ms <= options.offset_max_ms!);
  }

  entries.sort((a, b) => a.offset_ms - b.offset_ms);
  return entries;
}

export function formatMarkerEntry(entry: MarkerEntry): string {
  const parts = [entry.id, String(entry.offset_ms)];
  if (entry.label) parts.push(entry.label);
  if (entry.tags && entry.tags.length > 0) parts.push(entry.tags.join(','));
  if (entry.voice_note_id) parts.push(entry.voice_note_id);
  return parts.join('\t');
}
