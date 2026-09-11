import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'astro/config';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

// Static output: `astro build` emits plain HTML, CSS and a few kB of JS for
// OpenStreetMap (Leaflet). Arts, artists and regions are read from data/*.jsonl
// at build time, so no server or database is involved at request time.
export default defineConfig({
  // Cloudflare Workers/Pages only caches `node_modules/.astro` at the repo root,
  // and only if `astro` is a root package.json dependency. Keep the cache there
  // so CI does not skip it with "not supported for your project".
  cacheDir: path.join(repoRoot, 'node_modules/.astro'),
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  devToolbar: {
    enabled: false,
  },
});
