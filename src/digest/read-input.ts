import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { DigestActionRun, DigestInput, DigestMarker, DigestSessionSummary, DigestTimelineEntry, DigestTranscriptSegment, DigestVoiceNoteSummary } from './types.js';

async function readJsonl<T>(filePath: string, map: (obj: Record<string, unknown>) => T): Promise<T[]> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    return lines.map((line) => map(JSON.parse(line) as Record<string, unknown>));
  } catch {
    return [];
  }
}

function mapTimelineEntry(obj: Record<string, unknown>): DigestTimelineEntry {
  return {
    offset_ms: typeof obj.offset_ms === 'number' ? obj.offset_ms : 0,
    kind: typeof obj.kind === 'string' ? obj.kind : 'unknown',
  };
}

function mapMarker(obj: Record<string, unknown>): DigestMarker {
  return {
    offset_ms: typeof obj.offset_ms === 'number' ? obj.offset_ms : 0,
    label: typeof obj.label === 'string' ? obj.label : undefined,
    tags: Array.isArray(obj.tags) ? (obj.tags as string[]) : undefined,
  };
}

function mapTranscriptSegment(obj: Record<string, unknown>): DigestTranscriptSegment {
  return {
    offset_ms: typeof obj.offset_ms === 'number' ? obj.offset_ms : 0,
    duration_ms: typeof obj.duration_ms === 'number' ? obj.duration_ms : 0,
    text: typeof obj.text === 'string' ? obj.text : '',
  };
}

function mapVoiceNoteSummary(obj: Record<string, unknown>): DigestVoiceNoteSummary {
  return {
    offset_ms: typeof obj.offset_ms === 'number' ? obj.offset_ms : 0,
    duration_ms: typeof obj.duration_ms === 'number' ? obj.duration_ms : undefined,
    transcript_text: typeof obj.transcript_text === 'string' ? obj.transcript_text : undefined,
  };
}

function mapActionRun(obj: Record<string, unknown>): DigestActionRun {
  return {
    id: typeof obj.id === 'string' ? obj.id : '',
    action: typeof obj.action === 'string' ? obj.action : '',
    created_at: typeof obj.created_at === 'string' ? obj.created_at : '',
    status: typeof obj.status === 'string' ? obj.status : '',
    error: typeof obj.error === 'string' ? obj.error : undefined,
  };
}

/**
 * Read session directory into structured digest input.
 * Uses session.json for paths; timeline and markers are required (paths from session);
 * transcript and voice_notes are optional (missing or null path => empty array).
 */
export async function readDigestInput(sessionDir: string): Promise<DigestInput> {
  const resolvedDir = path.resolve(sessionDir);
  const sessionPath = path.join(resolvedDir, 'session.json');
  const raw = await readFile(sessionPath, 'utf8');
  const session = JSON.parse(raw) as Record<string, unknown>;

  const timeline_path = (session.timeline_path as string) ?? 'timeline.jsonl';
  const markers_path = (session.markers_path as string) ?? 'markers.jsonl';
  const transcript_path = session.transcript_path as string | null | undefined;
  const voice_notes_path = session.voice_notes_path as string | null | undefined;

  const sessionSummary: DigestSessionSummary = {
    id: (session.id as string) ?? '',
    start_time: (session.start_time as string) ?? '',
    status: (session.status as string) ?? 'active',
    end_time: session.end_time as string | undefined,
    duration_ms: typeof session.duration_ms === 'number' ? session.duration_ms : undefined,
  };

  const actionsPath = path.join(resolvedDir, 'actions.jsonl');

  const [timeline, markers, transcript, voice_notes, actionsRaw] = await Promise.all([
    readJsonl(path.join(resolvedDir, timeline_path), mapTimelineEntry),
    readJsonl(path.join(resolvedDir, markers_path), mapMarker),
    transcript_path
      ? readJsonl(path.join(resolvedDir, transcript_path), mapTranscriptSegment)
      : Promise.resolve([]),
    voice_notes_path
      ? readJsonl(path.join(resolvedDir, voice_notes_path), mapVoiceNoteSummary)
      : Promise.resolve([]),
    readJsonl(actionsPath, mapActionRun),
  ]);

  const actions = actionsRaw.slice(-20);

  return {
    session: sessionSummary,
    timeline,
    transcript,
    markers,
    voice_notes,
    actions,
  };
}
