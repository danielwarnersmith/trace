import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(moduleDir, '..');
export const traceSpecRoot = path.join(repoRoot, 'trace-spec');
