import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ulid } from 'ulid';

export type MarkerInput = {
  offset_ms: number;
  label?: string;
  note?: string;
  tags?: string[];
  voice_note_id?: string;
};

export type VoiceNoteInput = {
  offset_ms: number;
  duration_ms: number;
  /** Filename under media/ when file is already in session media dir (e.g. "note.m4a"). */
  media_filename?: string;
  /** Source path to copy into media/{ulid}.{ext}; takes precedence over media_filename. */
  media_file_path?: string;
  transcript_text?: string;
  marker_id?: string;
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

async function voiceNoteExists(voiceNotesPath: string, id: string): Promise<boolean> {
  try {
    const content = await readFile(voiceNotesPath, 'utf8');
    const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
    return lines.some((line) => {
      const obj = JSON.parse(line) as Record<string, unknown>;
      return obj.id === id;
    });
  } catch {
    return false;
  }
}

export async function addMarker(sessionDir: string, input: MarkerInput): Promise<string> {
  const resolvedDir = path.resolve(sessionDir);
  const sessionPath = path.join(resolvedDir, 'session.json');
  const markersPath = path.join(resolvedDir, 'markers.jsonl');

  if (input.voice_note_id) {
    const session = await readSession(sessionPath);
    const voiceNotesPath = (session.voice_notes_path as string) ?? 'voice_notes.jsonl';
    const fullPath = path.join(resolvedDir, voiceNotesPath);
    const exists = await voiceNoteExists(fullPath, input.voice_note_id);
    if (!exists) {
      throw new Error(`voice_note_id not found: ${input.voice_note_id}`);
    }
  }

  const marker = {
    id: ulid(),
    offset_ms: input.offset_ms,
    created_at: nowIso(),
    source: 'user',
    label: input.label,
    note: input.note,
    tags: input.tags,
    ...(input.voice_note_id ? { voice_note_id: input.voice_note_id } : {}),
  };

  await writeFile(markersPath, `${JSON.stringify(marker)}\n`, { flag: 'a' });

  const session = await readSession(sessionPath);
  session.updated_at = nowIso();
  await writeSession(sessionPath, session);

  return marker.id;
}

async function getMarkerById(markersPath: string, id: string): Promise<Record<string, unknown> | null> {
  try {
    const content = await readFile(markersPath, 'utf8');
    const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
    let last: Record<string, unknown> | null = null;
    for (const line of lines) {
      const obj = JSON.parse(line) as Record<string, unknown>;
      if (obj.id === id) {
        last = obj;
      }
    }
    return last;
  } catch {
    return null;
  }
}

export async function addVoiceNote(sessionDir: string, input: VoiceNoteInput): Promise<string> {
  const resolvedDir = path.resolve(sessionDir);
  const sessionPath = path.join(resolvedDir, 'session.json');
  const markersPath = path.join(resolvedDir, 'markers.jsonl');
  const voiceNotesPath = path.join(resolvedDir, 'voice_notes.jsonl');
  const mediaDir = path.join(resolvedDir, 'media');

  if (!input.media_filename && !input.media_file_path) {
    throw new Error('missing media_filename or media_file_path');
  }

  if (input.marker_id) {
    const marker = await getMarkerById(markersPath, input.marker_id);
    if (!marker) {
      throw new Error(`marker_id not found: ${input.marker_id}`);
    }
  }

  await mkdir(mediaDir, { recursive: true });

  const voiceNoteId = ulid();
  let media_path: string;
  if (input.media_file_path) {
    const ext = path.extname(input.media_file_path) || '';
    const basename = `${voiceNoteId}${ext}`;
    media_path = `media/${basename}`;
    const destPath = path.join(resolvedDir, media_path);
    await copyFile(path.resolve(input.media_file_path), destPath);
  } else {
    media_path = `media/${input.media_filename!}`;
  }
  const voiceNote = {
    id: voiceNoteId,
    created_at: nowIso(),
    media_path,
    offset_ms: input.offset_ms,
    duration_ms: input.duration_ms,
    transcript_text: input.transcript_text,
    ...(input.marker_id ? { marker_id: input.marker_id } : {}),
  };

  await writeFile(voiceNotesPath, `${JSON.stringify(voiceNote)}\n`, { flag: 'a' });

  if (input.marker_id) {
    const marker = await getMarkerById(markersPath, input.marker_id);
    if (marker) {
      const updated = { ...marker, voice_note_id: voiceNoteId };
      await writeFile(markersPath, `${JSON.stringify(updated)}\n`, { flag: 'a' });
    }
  }

  const session = await readSession(sessionPath);
  session.voice_notes_path = 'voice_notes.jsonl';
  session.updated_at = nowIso();
  await writeSession(sessionPath, session);

  return voiceNoteId;
}
