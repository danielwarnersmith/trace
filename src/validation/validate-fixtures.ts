import { validateAllFixtures } from './fixtures.js';

const results = await validateAllFixtures();
const failures = results.filter((result) => !result.ok);

for (const result of results) {
  if (result.ok) {
    console.log(`ok: ${result.name}`);
  } else {
    for (const error of result.errors) {
      console.error(`error: ${result.name}: ${error}`);
    }
  }
}

if (failures.length > 0) {
  process.exit(1);
}
