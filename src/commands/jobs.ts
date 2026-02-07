import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ulid } from 'ulid';
import { updateVoiceNoteTranscript } from './mark.js';

const PENDING_DIR = 'jobs';
const PENDING_FILE = 'pending.jsonl';
const COMPLETED_FILE = 'completed.jsonl';

export type Job = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

async function ensureJobsDir(resolvedDir: string): Promise<string> {
  const jobsDir = path.join(resolvedDir, PENDING_DIR);
  await mkdir(jobsDir, { recursive: true });
  return jobsDir;
}

async function readJsonlLines(filePath: string): Promise<Record<string, unknown>[]> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return raw
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  } catch {
    return [];
  }
}

async function appendJobLine(jobsDir: string, filename: string, job: Job): Promise<void> {
  const filePath = path.join(jobsDir, filename);
  await writeFile(filePath, `${JSON.stringify(job)}\n`, { flag: 'a' });
}

/**
 * Add a job to the session's pending queue.
 */
export async function addJob(
  sessionDir: string,
  type: string,
  payload: Record<string, unknown> = {},
): Promise<string> {
  const resolvedDir = path.resolve(sessionDir);
  const jobsDir = await ensureJobsDir(resolvedDir);
  const id = ulid();
  const job: Job = {
    id,
    type,
    payload,
    created_at: nowIso(),
    status: 'pending',
  };
  await appendJobLine(jobsDir, PENDING_FILE, job);
  return id;
}

/**
 * Process pending jobs: read pending.jsonl, run each job, move to completed.jsonl.
 * transcribe_voice_note: stub — sets transcript_text to "[transcribed]".
 */
export async function processJobs(sessionDir: string, options: { once?: boolean } = {}): Promise<number> {
  const resolvedDir = path.resolve(sessionDir);
  const jobsDir = await ensureJobsDir(resolvedDir);
  const pendingPath = path.join(jobsDir, PENDING_FILE);
  const completedPath = path.join(jobsDir, COMPLETED_FILE);

  const pending = await readJsonlLines(pendingPath);
  if (pending.length === 0) {
    return 0;
  }

  const toProcess = options.once ? pending.slice(0, 1) : pending;
  const remaining = options.once ? pending.slice(1) : [];

  for (const raw of toProcess) {
    const job = raw as unknown as Job;
    job.status = 'running';
    try {
      if (job.type === 'transcribe_voice_note') {
        const voiceNoteId = job.payload?.voice_note_id as string | undefined;
        if (!voiceNoteId) {
          job.status = 'failed';
          job.error = 'missing voice_note_id in payload';
        } else {
          await updateVoiceNoteTranscript(resolvedDir, voiceNoteId, '[transcribed]');
          job.status = 'completed';
        }
      } else {
        job.status = 'failed';
        job.error = `unknown job type: ${job.type}`;
      }
    } catch (err) {
      job.status = 'failed';
      job.error = err instanceof Error ? err.message : String(err);
    }
    await appendJobLine(jobsDir, COMPLETED_FILE, job);
  }

  await writeFile(
    pendingPath,
    remaining.map((obj) => JSON.stringify(obj)).join('\n') + (remaining.length > 0 ? '\n' : ''),
    'utf8',
  );
  return toProcess.length;
}
