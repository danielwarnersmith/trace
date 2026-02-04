import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ulid } from 'ulid';

export type MarkerInput = {
  offset_ms: number;
  label?: string;
  note?: string;
  tags?: string[];
};

export type VoiceNoteInput = {
  offset_ms: number;
  duration_ms: number;
  media_filename: string;
  transcript_text?: string;
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

export async function addMarker(sessionDir: string, input: MarkerInput): Promise<string> {
  const resolvedDir = path.resolve(sessionDir);
  const sessionPath = path.join(resolvedDir, 'session.json');
  const markersPath = path.join(resolvedDir, 'markers.jsonl');

  const marker = {
    id: ulid(),
    offset_ms: input.offset_ms,
    created_at: nowIso(),
    source: 'user',
    label: input.label,
    note: input.note,
    tags: input.tags
  };

  await writeFile(markersPath, `${JSON.stringify(marker)}\n`, { flag: 'a' });

  const session = await readSession(sessionPath);
  session.updated_at = nowIso();
  await writeSession(sessionPath, session);

  return marker.id;
}

export async function addVoiceNote(sessionDir: string, input: VoiceNoteInput): Promise<string> {
  const resolvedDir = path.resolve(sessionDir);
  const sessionPath = path.join(resolvedDir, 'session.json');
  const voiceNotesPath = path.join(resolvedDir, 'voice_notes.jsonl');
  const mediaDir = path.join(resolvedDir, 'media');

  await mkdir(mediaDir, { recursive: true });

  const voiceNote = {
    id: ulid(),
    created_at: nowIso(),
    media_path: `media/${input.media_filename}`,
    offset_ms: input.offset_ms,
    duration_ms: input.duration_ms,
    transcript_text: input.transcript_text
  };

  await writeFile(voiceNotesPath, `${JSON.stringify(voiceNote)}\n`, { flag: 'a' });

  const session = await readSession(sessionPath);
  session.voice_notes_path = 'voice_notes.jsonl';
  session.updated_at = nowIso();
  await writeSession(sessionPath, session);

  return voiceNote.id;
}
