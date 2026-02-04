import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { traceSpecRoot } from '../paths.js';

export type SchemaName =
  | 'session'
  | 'timeline'
  | 'marker'
  | 'voice_note'
  | 'transcript'
  | 'actions';

const ajv = new Ajv2020({ allErrors: true, strict: true });
const schemaCache = new Map<SchemaName, ValidateFunction>();

function schemaPath(name: SchemaName): string {
  return path.join(traceSpecRoot, 'schemas', `${name}.schema.json`);
}

export async function getValidator(name: SchemaName): Promise<ValidateFunction> {
  const cached = schemaCache.get(name);
  if (cached) {
    return cached;
  }

  const raw = await readFile(schemaPath(name), 'utf8');
  const schema = JSON.parse(raw) as object;
  const validate = ajv.compile(schema);
  schemaCache.set(name, validate);
  return validate;
}

export type ValidationResult = {
  ok: boolean;
  errors: ErrorObject[];
};

export async function validateJson(
  name: SchemaName,
  data: unknown,
): Promise<ValidationResult> {
  const validate = await getValidator(name);
  const ok = Boolean(validate(data));
  return { ok, errors: validate.errors ?? [] };
}

export function formatAjvErrors(errors: ErrorObject[]): string {
  if (!errors.length) {
    return 'unknown validation error';
  }

  return errors
    .map((error) => {
      const path = error.instancePath || '/';
      const message = error.message ?? 'invalid';
      return `${path} ${message}`;
    })
    .join('; ');
}
