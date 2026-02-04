import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { formatAjvErrors, validateJson, type SchemaName } from '../validation/validator.js';

export type ValidationIssue = {
  file: string;
  message: string;
};

export type ValidationReport = {
  ok: boolean;
  issues: ValidationIssue[];
};

type SessionShape = {
  status?: 'active' | 'closed';
  start_time?: string;
  end_time?: string;
  duration_ms?: number;
  media?: Array<{ path?: string }>;
  transcript_path?: string | null;
  voice_notes_path?: string | null;
  digest_path?: string | null;
};

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

async function readJson(filePath: string, issues: ValidationIssue[]): Promise<unknown | null> {
  if (!(await exists(filePath))) {
    issues.push({ file: filePath, message: 'missing file' });
    return null;
  }

  const content = await readFile(filePath, 'utf8');
  try {
    return JSON.parse(content) as unknown;
  } catch (error) {
    issues.push({
      file: filePath,
      message: `invalid JSON: ${(error as Error).message}`,
    });
    return null;
  }
}

async function validateJsonFile(
  filePath: string,
  schema: SchemaName,
  issues: ValidationIssue[],
): Promise<void> {
  const data = await readJson(filePath, issues);
  if (data === null) {
    return;
  }

  const result = await validateJson(schema, data);
  if (!result.ok) {
    issues.push({ file: filePath, message: formatAjvErrors(result.errors) });
  }
}

async function validateJsonl(
  filePath: string,
  schema: SchemaName,
  issues: ValidationIssue[],
  required: boolean,
): Promise<unknown[]> {
  if (!(await exists(filePath))) {
    if (required) {
      issues.push({ file: filePath, message: 'missing file' });
    }
    return [];
  }

  const content = await readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const entries: unknown[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    let data: unknown;
    try {
      data = JSON.parse(line) as unknown;
    } catch (error) {
      issues.push({
        file: filePath,
        message: `line ${index + 1}: invalid JSON: ${(error as Error).message}`,
      });
      continue;
    }

    entries.push(data);
    const result = await validateJson(schema, data);
    if (!result.ok) {
      issues.push({
        file: filePath,
        message: `line ${index + 1}: ${formatAjvErrors(result.errors)}`,
      });
    }
  }

  return entries;
}

function extractNumber(entry: unknown, key: string): number | undefined {
  if (!entry || typeof entry !== 'object') {
    return undefined;
  }
  const value = (entry as Record<string, unknown>)[key];
  return typeof value === 'number' ? value : undefined;
}

function extractString(entry: unknown, key: string): string | undefined {
  if (!entry || typeof entry !== 'object') {
    return undefined;
  }
  const value = (entry as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

function ensureNonDecreasing(
  entries: unknown[],
  filePath: string,
  issues: ValidationIssue[],
  label: string,
): void {
  let last = -Infinity;
  entries.forEach((entry, index) => {
    const offset = extractNumber(entry, 'offset_ms');
    if (offset === undefined) {
      return;
    }
    if (offset < last) {
      issues.push({
        file: filePath,
        message: `${label} offset_ms out of order at entry ${index + 1}`,
      });
    }
    last = offset;
  });
}

export async function validateSessionDir(sessionDir: string): Promise<ValidationReport> {
  const issues: ValidationIssue[] = [];
  const resolvedDir = path.resolve(sessionDir);
  const sessionPath = path.join(resolvedDir, 'session.json');

  const sessionData = await readJson(sessionPath, issues);
  if (sessionData === null) {
    return { ok: false, issues };
  }

  const sessionResult = await validateJson('session', sessionData);
  if (!sessionResult.ok) {
    issues.push({ file: sessionPath, message: formatAjvErrors(sessionResult.errors) });
  }

  const timelinePath = path.join(resolvedDir, 'timeline.jsonl');
  const markersPath = path.join(resolvedDir, 'markers.jsonl');

  const timelineEntries = await validateJsonl(
    timelinePath,
    'timeline',
    issues,
    true,
  );
  ensureNonDecreasing(timelineEntries, timelinePath, issues, 'timeline');

  const markerEntries = await validateJsonl(markersPath, 'marker', issues, true);

  const session = sessionData as SessionShape;
  let transcriptEntries: unknown[] = [];
  if (session.transcript_path) {
    const transcriptPath = path.join(resolvedDir, session.transcript_path);
    transcriptEntries = await validateJsonl(transcriptPath, 'transcript', issues, true);
    ensureNonDecreasing(transcriptEntries, transcriptPath, issues, 'transcript');
  }

  let voiceNoteEntries: unknown[] = [];
  if (session.voice_notes_path) {
    const voiceNotesPath = path.join(resolvedDir, session.voice_notes_path);
    voiceNoteEntries = await validateJsonl(voiceNotesPath, 'voice_note', issues, true);
  }

  if (session.digest_path) {
    const digestPath = path.join(resolvedDir, session.digest_path);
    if (!(await exists(digestPath))) {
      issues.push({ file: digestPath, message: 'missing file' });
    }
  }

  const actionsPath = path.join(resolvedDir, 'actions.jsonl');
  if (await exists(actionsPath)) {
    await validateJsonl(actionsPath, 'actions', issues, false);
  }

  if (Array.isArray(session.media)) {
    for (const [index, entry] of session.media.entries()) {
      const mediaPath = extractString(entry, 'path');
      if (!mediaPath) {
        continue;
      }
      const fullPath = path.join(resolvedDir, mediaPath);
      if (!(await exists(fullPath))) {
        issues.push({
          file: sessionPath,
          message: `media file missing at index ${index + 1}: ${mediaPath}`,
        });
      }
    }
  }

  const markerIds = new Set(
    markerEntries.map((entry) => extractString(entry, 'id')).filter(Boolean) as string[],
  );
  const voiceNoteIds = new Set(
    voiceNoteEntries.map((entry) => extractString(entry, 'id')).filter(Boolean) as string[],
  );

  for (const entry of markerEntries) {
    const voiceNoteId = extractString(entry, 'voice_note_id');
    if (!voiceNoteId) {
      continue;
    }
    if (voiceNoteEntries.length === 0) {
      issues.push({
        file: markersPath,
        message: `marker references voice_note_id but voice_notes.jsonl is missing`,
      });
      continue;
    }
    if (!voiceNoteIds.has(voiceNoteId)) {
      issues.push({
        file: markersPath,
        message: `marker voice_note_id not found: ${voiceNoteId}`,
      });
    }
  }

  for (const entry of voiceNoteEntries) {
    const markerId = extractString(entry, 'marker_id');
    if (markerId && !markerIds.has(markerId)) {
      issues.push({
        file: path.join(resolvedDir, session.voice_notes_path ?? 'voice_notes.jsonl'),
        message: `voice_note marker_id not found: ${markerId}`,
      });
    }

    const mediaPath = extractString(entry, 'media_path');
    if (mediaPath) {
      const fullPath = path.join(resolvedDir, mediaPath);
      if (!(await exists(fullPath))) {
        issues.push({
          file: path.join(resolvedDir, session.voice_notes_path ?? 'voice_notes.jsonl'),
          message: `voice_note media file missing: ${mediaPath}`,
        });
      }
    }
  }

  const timelineStart = timelineEntries.find(
    (entry) =>
      typeof entry === 'object' &&
      entry !== null &&
      (entry as Record<string, unknown>).kind === 'session_start',
  ) as Record<string, unknown> | undefined;

  if (!timelineStart) {
    issues.push({ file: timelinePath, message: 'missing session_start' });
  } else if ((timelineStart.offset_ms as number | undefined) !== 0) {
    issues.push({
      file: timelinePath,
      message: 'session_start offset_ms must be 0',
    });
  }

  if (session.status === 'closed') {
    if (!session.end_time) {
      issues.push({ file: sessionPath, message: 'closed session missing end_time' });
    }
    if (session.duration_ms === undefined) {
      issues.push({ file: sessionPath, message: 'closed session missing duration_ms' });
    }

    const endEntry = timelineEntries.find(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        (entry as Record<string, unknown>).kind === 'session_end',
    ) as Record<string, unknown> | undefined;

    if (!endEntry) {
      issues.push({ file: timelinePath, message: 'missing session_end' });
    } else if (
      session.duration_ms !== undefined &&
      (endEntry.offset_ms as number | undefined) !== session.duration_ms
    ) {
      issues.push({
        file: timelinePath,
        message: 'session_end offset_ms must equal session.duration_ms',
      });
    }
  }

  return { ok: issues.length === 0, issues };
}
