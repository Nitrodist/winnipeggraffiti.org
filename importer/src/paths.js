import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repository root (the directory that contains `data/`, `site/`, `importer/`). */
export const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export const defaultDataDir = path.join(repoRoot, 'data');
export const defaultImageDir = path.join(repoRoot, 'site/public/images/arts');
export const defaultInboxDir = path.join(repoRoot, 'inbox');
