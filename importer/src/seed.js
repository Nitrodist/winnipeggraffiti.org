import path from 'node:path';

import { CATEGORIES } from './categories.js';
import { writeJsonl } from './jsonl.js';
import { defaultDataDir } from './paths.js';
import { REGIONS } from './regions.js';

const dataDir = process.argv[2] ?? defaultDataDir;

await writeJsonl(path.join(dataDir, 'regions.jsonl'), REGIONS);
await writeJsonl(
  path.join(dataDir, 'categories.jsonl'),
  CATEGORIES.map((category) => ({ id: category.slug, ...category })),
);

console.log(`Wrote ${REGIONS.length} regions and ${CATEGORIES.length} categories to ${dataDir}`);
