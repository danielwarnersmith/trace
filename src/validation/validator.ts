import Ajv2020Module from 'ajv/dist/2020.js';
import { type ErrorObject, type ValidateFunction } from 'ajv';
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

// Ajv 2020 default export is not recognized as constructable by TS with NodeNext; use type assertion
const Ajv2020 = Ajv2020Module as unknown as new (opts?: { allErrors?: boolean; strict?: boolean }) => {
  compile: (schema: object) => ValidateFunction;
};
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
