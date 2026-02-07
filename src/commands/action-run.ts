import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ulid } from 'ulid';

export type ActionRunResult = {
  id: string;
  status: 'succeeded' | 'failed';
};

function nowIso(): string {
  return new Date().toISOString();
}

async function ensureActionsFile(actionsPath: string): Promise<void> {
  try {
    await access(actionsPath);
  } catch {
    await writeFile(actionsPath, '', 'utf8');
  }
}

function appendActionRun(
  actionsPath: string,
  entry: {
    id: string;
    action: string;
    created_at: string;
    status: 'started' | 'succeeded' | 'failed';
    inputs?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    error?: string;
  },
): Promise<void> {
  return writeFile(actionsPath, `${JSON.stringify(entry)}\n`, { flag: 'a' });
}

export type ActionHandler = (
  sessionDir: string,
  inputs: Record<string, string>,
) => Promise<{ outputs?: Record<string, unknown> }>;

const actionRegistry = new Map<string, ActionHandler>();

export function registerAction(actionId: string, handler: ActionHandler): void {
  actionRegistry.set(actionId, handler);
}

export async function runAction(
  sessionDir: string,
  actionId: string,
  inputs: Record<string, string> = {},
): Promise<ActionRunResult> {
  const resolvedDir = path.resolve(sessionDir);
  const sessionPath = path.join(resolvedDir, 'session.json');
  const actionsPath = path.join(resolvedDir, 'actions.jsonl');

  await access(sessionPath);

  await ensureActionsFile(actionsPath);

  const id = ulid();
  const created_at = nowIso();

  await appendActionRun(actionsPath, {
    id,
    action: actionId,
    created_at,
    status: 'started',
    ...(Object.keys(inputs).length > 0 ? { inputs: inputs as Record<string, unknown> } : {}),
  });

  const handler = actionRegistry.get(actionId);
  if (!handler) {
    const errorMessage = `unknown action: ${actionId}`;
    await appendActionRun(actionsPath, {
      id,
      action: actionId,
      created_at,
      status: 'failed',
      ...(Object.keys(inputs).length > 0 ? { inputs: inputs as Record<string, unknown> } : {}),
      error: errorMessage,
    });
    throw new Error(errorMessage);
  }

  try {
    const result = await handler(resolvedDir, inputs);
    await appendActionRun(actionsPath, {
      id,
      action: actionId,
      created_at,
      status: 'succeeded',
      ...(Object.keys(inputs).length > 0 ? { inputs: inputs as Record<string, unknown> } : {}),
      ...(result.outputs ? { outputs: result.outputs } : {}),
    });
    return { id, status: 'succeeded' };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await appendActionRun(actionsPath, {
      id,
      action: actionId,
      created_at,
      status: 'failed',
      ...(Object.keys(inputs).length > 0 ? { inputs: inputs as Record<string, unknown> } : {}),
      error: errorMessage,
    });
    return { id, status: 'failed' };
  }
}
