/**
 * CC → category mapping for TRACE Stage 2 (Signal).
 * Maps (channel, CC number) to one of: highlight, structure, texture-sample, fix-review.
 * Config: trace-spec/midi-categories.json (default) or .trace-midi.json in repo root to override.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { repoRoot, traceSpecRoot } from '../paths.js';

export const CATEGORY_TAGS = [
  'highlight',
  'structure',
  'texture-sample',
  'fix-review',
] as const;

export type CategoryTag = (typeof CATEGORY_TAGS)[number];

const DEFAULT_CONFIG_PATH = path.join(traceSpecRoot, 'midi-categories.json');
const OVERRIDE_CONFIG_PATH = path.join(repoRoot, '.trace-midi.json');

type ConfigMap = Record<string, string>;

let cachedMap: ConfigMap | null = null;

function configKey(channel: number, controller: number): string {
  return `${channel}:${controller}`;
}

/**
 * Load CC → category map. Uses .trace-midi.json in repo root if present, else trace-spec/midi-categories.json.
 * Keys: "channel:controller" (e.g. "0:20"). Values: category tag string.
 */
export async function loadCategoryMap(): Promise<ConfigMap> {
  if (cachedMap !== null) return cachedMap;
  try {
    const raw = await readFile(OVERRIDE_CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      cachedMap = parsed as ConfigMap;
      return cachedMap;
    }
  } catch {
    // no override or invalid; use default
  }
  const raw = await readFile(DEFAULT_CONFIG_PATH, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    cachedMap = parsed as ConfigMap;
    return cachedMap;
  }
  cachedMap = {};
  return cachedMap;
}

/**
 * Resolve category tag for a CC event. Returns null if not mapped.
 * Use after loadCategoryMap() (or call getCategoryForCCSync after ensureCategoryMapLoaded).
 */
export async function getCategoryForCC(
  channel: number,
  controller: number,
  _value?: number,
): Promise<string | null> {
  const map = await loadCategoryMap();
  const key = configKey(channel, controller);
  const tag = map[key];
  if (typeof tag !== 'string' || tag.length === 0) return null;
  return tag;
}

/**
 * Synchronous resolve: requires category map to be loaded first (e.g. by getCategoryForCC once).
 * Use when you already have the map in memory (e.g. in midi listen callback after first load).
 */
export function getCategoryForCCSync(
  map: ConfigMap,
  channel: number,
  controller: number,
  _value?: number,
): string | null {
  const key = configKey(channel, controller);
  const tag = map[key];
  if (typeof tag !== 'string' || tag.length === 0) return null;
  return tag;
}
