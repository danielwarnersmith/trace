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
): Promise<void> {
  if (!(await exists(filePath))) {
    if (required) {
      issues.push({ file: filePath, message: 'missing file' });
    }
    return;
  }

  const content = await readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

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

    const result = await validateJson(schema, data);
    if (!result.ok) {
      issues.push({
        file: filePath,
        message: `line ${index + 1}: ${formatAjvErrors(result.errors)}`,
      });
    }
  }
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

  await validateJsonl(path.join(resolvedDir, 'timeline.jsonl'), 'timeline', issues, true);
  await validateJsonl(path.join(resolvedDir, 'markers.jsonl'), 'marker', issues, true);

  const session = sessionData as SessionShape;
  if (session.transcript_path) {
    await validateJsonl(
      path.join(resolvedDir, session.transcript_path),
      'transcript',
      issues,
      true,
    );
  }

  if (session.voice_notes_path) {
    await validateJsonl(
      path.join(resolvedDir, session.voice_notes_path),
      'voice_note',
      issues,
      true,
    );
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

  return { ok: issues.length === 0, issues };
}
