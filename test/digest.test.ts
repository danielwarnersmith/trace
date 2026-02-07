import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { readDigestInput, generateDigestContent } from '../src/digest/index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturesDir = path.join(repoRoot, 'trace-spec', 'fixtures');

test('readDigestInput reads timeline and markers from fixtures', async () => {
  const input = await readDigestInput(fixturesDir);
  assert.equal(typeof input.session.id, 'string');
  assert.equal(typeof input.session.start_time, 'string');
  assert.equal(typeof input.session.status, 'string');
  assert.ok(Array.isArray(input.timeline));
  assert.ok(Array.isArray(input.markers));
  assert.ok(input.timeline.length >= 1);
  assert.ok(input.markers.length >= 1);
  assert.ok(input.timeline[0].offset_ms >= 0);
  assert.ok(input.markers[0].offset_ms >= 0);
});

test('generateDigestContent produces markdown with session info and notable moments', async () => {
  const input = await readDigestInput(fixturesDir);
  const content = generateDigestContent(input);
  assert.ok(content.includes('# Session digest'));
  assert.ok(content.includes(input.session.id));
  assert.ok(content.includes('Markers:'));
  assert.ok(content.includes(String(input.markers.length)));
  assert.ok(content.includes('Notable moments') || content.includes('**Markers:**'));
  // At least one marker with timestamp
  const marker = input.markers[0];
  const timeLabel = marker.label ?? (marker.tags?.length ? marker.tags[0] : 'marker');
  assert.ok(content.includes(timeLabel), `expected content to include marker label/tag: ${timeLabel}`);
});
