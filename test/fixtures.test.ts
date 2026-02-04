import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAllFixtures, type FixtureResult } from '../src/validation/fixtures.js';

function formatFailures(failures: FixtureResult[]): string {
  return failures.map((failure) => `${failure.name}: ${failure.errors.join('; ')}`).join('\n');
}

test('fixtures validate against schemas', async () => {
  const results = await validateAllFixtures();
  const failures = results.filter((result) => !result.ok);
  assert.equal(failures.length, 0, formatFailures(failures));
});
