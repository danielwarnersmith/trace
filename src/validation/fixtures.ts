import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { traceSpecRoot } from '../paths.js';
import { formatAjvErrors, validateJson, type SchemaName } from './validator.js';

export type FixtureFormat = 'json' | 'jsonl';

export type FixtureSpec = {
  name: string;
  schema: SchemaName;
  file: string;
  format: FixtureFormat;
};

export type FixtureResult = {
  name: string;
  ok: boolean;
  errors: string[];
};

const fixturesDir = path.join(traceSpecRoot, 'fixtures');

export const fixtureSpecs: FixtureSpec[] = [
  { name: 'session', schema: 'session', file: 'session.json', format: 'json' },
  { name: 'timeline', schema: 'timeline', file: 'timeline.jsonl', format: 'jsonl' },
  { name: 'markers', schema: 'marker', file: 'markers.jsonl', format: 'jsonl' },
  { name: 'voice_notes', schema: 'voice_note', file: 'voice_notes.jsonl', format: 'jsonl' },
  { name: 'transcript', schema: 'transcript', file: 'transcript.jsonl', format: 'jsonl' },
  { name: 'actions', schema: 'actions', file: 'actions.jsonl', format: 'jsonl' }
];

export async function validateFixture(spec: FixtureSpec): Promise<FixtureResult> {
  const fullPath = path.join(fixturesDir, spec.file);
  const content = await readFile(fullPath, 'utf8');
  const errors: string[] = [];

  if (spec.format === 'json') {
    const data = JSON.parse(content) as unknown;
    const result = await validateJson(spec.schema, data);
    if (!result.ok) {
      errors.push(formatAjvErrors(result.errors));
    }
  } else {
    const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const data = JSON.parse(line) as unknown;
      const result = await validateJson(spec.schema, data);
      if (!result.ok) {
        errors.push(`line ${index + 1}: ${formatAjvErrors(result.errors)}`);
      }
    }
  }

  return { name: spec.name, ok: errors.length === 0, errors };
}

export async function validateAllFixtures(): Promise<FixtureResult[]> {
  const results: FixtureResult[] = [];
  for (const spec of fixtureSpecs) {
    results.push(await validateFixture(spec));
  }
  return results;
}
