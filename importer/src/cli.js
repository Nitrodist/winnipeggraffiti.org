import path from 'node:path';
import { parseArgs } from 'node:util';

import { confirm, input, search, select } from '@inquirer/prompts';

import { CATEGORIES } from './categories.js';
import { readExif } from './exif.js';
import { importFiles, listImages } from './import.js';
import { parseLocation } from './location.js';
import { defaultDataDir, defaultImageDir, defaultInboxDir } from './paths.js';
import { readJsonl } from './jsonl.js';

const HELP = `Usage: npm run import -- [directory]

Imports image files from a directory (or a single file) into data/arts.jsonl.
Each image may have a sidecar <name>.json. EXIF GPS and titles are read when
present. Anything still missing is prompted for in the terminal.

Options:
  --dir <path>     Directory or file to import (default: ./inbox, or the
                   first positional argument)
  --data-dir <dir> JSONL tables (default: ./data)
  --image-dir <dir> Where copied images are stored (default: site/public/images/arts)
  -h, --help       Show this help

Sidecar example (saved next to mural.jpg as mural.json):

  {
    "name": "Band name piece",
    "category": "graffiti",
    "region": "Exchange District",
    "location": { "lat": 49.8985, "lon": -97.1403 },
    "artist_name": "Someone",
    "create_artist": true
  }

Category must be "graffiti" or "outdoor-art". Location may also be an
OpenStreetMap URL such as https://www.openstreetmap.org/#map=18/49.8985/-97.1403
`;

async function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      dir: { type: 'string' },
      'data-dir': { type: 'string' },
      'image-dir': { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) {
    process.stdout.write(HELP);
    return 0;
  }

  const target = values.dir ?? positionals[0] ?? defaultInboxDir;
  const dataDir = values['data-dir'] ?? defaultDataDir;
  const imageDir = values['image-dir'] ?? defaultImageDir;

  let files;
  try {
    files = await listImages(target);
  } catch (error) {
    if (error.code === 'ENOENT') {
      process.stderr.write(
        `Nothing to import at ${target}. Pass a directory of images: npm run import -- ./photos\n`,
      );
      return 1;
    }
    throw error;
  }

  if (files.length === 0) {
    process.stderr.write(`No jpg/png/webp/gif files found in ${target}.\n`);
    return 1;
  }

  const regions = await readJsonl(path.join(dataDir, 'regions.jsonl'));
  const prompt = createTerminalPrompt(regions);

  console.log(`Found ${files.length} image${files.length === 1 ? '' : 's'} in ${target}`);

  const results = await importFiles(files, {
    dataDir,
    imageDir,
    prompt,
    readExif,
    log: (line) => console.log(line),
  });

  console.log(
    `\nImported ${results.imported}, skipped ${results.skipped}, created ${results.artistsCreated} artist page${
      results.artistsCreated === 1 ? '' : 's'
    }.`,
  );
  return 0;
}

function createTerminalPrompt(regions) {
  return {
    async ask(field, draft) {
      switch (field) {
        case 'name':
          return input({
            message: 'Name',
            default: draft.nameFromFile || undefined,
            validate: (value) => (value.trim() ? true : 'A name is required'),
          }).then((value) => value.trim());
        case 'category':
          return select({
            message: 'Category',
            choices: CATEGORIES.map((category) => ({
              name: category.name,
              value: category.slug,
            })),
          });
        case 'region':
          return search({
            message: 'Region of Winnipeg',
            source: async (term) => {
              const q = (term ?? '').toLowerCase();
              return regions
                .filter((region) => !q || region.name.toLowerCase().includes(q))
                .map((region) => ({ name: region.name, value: region.name }));
            },
          });
        case 'location':
          return input({
            message: 'Location (OpenStreetMap URL or lat,lon)',
            validate: (value) =>
              parseLocation(value) ? true : 'Paste an OSM URL or a lat,lon pair',
          }).then((value) => parseLocation(value));
        case 'artist_name':
          return input({
            message: 'Artist name (optional, Enter to skip)',
            default: '',
          }).then((value) => value.trim());
        case 'description':
          return input({
            message: 'Description (optional, Enter to skip)',
            default: '',
          }).then((value) => value.trim());
        default:
          throw new Error(`Unknown prompt field: ${field}`);
      }
    },
    confirm(message, defaultValue = true) {
      return confirm({ message, default: defaultValue });
    },
  };
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
