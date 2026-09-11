import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { CATEGORIES } from '../src/categories.js';
import {
  importFiles,
  mergeDraft,
  missingFields,
  nameFromFile,
  sidecarPath,
} from '../src/import.js';
import { writeJsonl, readJsonl } from '../src/jsonl.js';
import { REGIONS } from '../src/regions.js';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

let root;

before(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'wpg-import-'));
});

after(async () => {
  await rm(root, { recursive: true, force: true });
});

async function setupDirs() {
  const dataDir = path.join(root, `data-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const imageDir = path.join(dataDir, 'images');
  const inbox = path.join(dataDir, 'inbox');
  await mkdir(inbox, { recursive: true });
  await writeJsonl(path.join(dataDir, 'regions.jsonl'), REGIONS);
  await writeJsonl(
    path.join(dataDir, 'categories.jsonl'),
    CATEGORIES.map((category) => ({ id: category.slug, ...category })),
  );
  await writeJsonl(path.join(dataDir, 'arts.jsonl'), []);
  await writeJsonl(path.join(dataDir, 'artists.jsonl'), []);
  return { dataDir, imageDir, inbox };
}

describe('mergeDraft', () => {
  it('lets sidecar values win over EXIF, and treats the filename as a hint only', () => {
    const draft = mergeDraft({
      file: '/tmp/wall-piece.png',
      exif: {
        title: 'From EXIF',
        location: { lat: 49.8, lon: -97.1 },
        description: 'exif caption',
      },
      sidecar: {
        name: 'Sidecar name',
        category: 'outdoor art',
        region: 'The Forks',
        artist_name: 'Ada',
        location: 'https://www.openstreetmap.org/#map=18/49.8874/-97.1312',
      },
    });
    assert.equal(draft.name, 'Sidecar name');
    assert.equal(draft.category, 'outdoor-art');
    assert.equal(draft.region, 'The Forks');
    assert.equal(draft.artist_name, 'Ada');
    assert.deepEqual(draft.location, { lat: 49.8874, lon: -97.1312 });
    assert.equal(draft.nameFromFile, 'wall piece');
    assert.equal(nameFromFile('/x/IMG_001.jpg'), 'IMG 001');
    assert.equal(sidecarPath('/x/mural.jpg'), '/x/mural.json');
  });

  it('reports the required fields that are still blank', () => {
    assert.deepEqual(missingFields(mergeDraft({ file: 'a.jpg' })), [
      'name',
      'category',
      'region',
      'location',
    ]);
  });
});

describe('importFiles', () => {
  it('imports a complete sidecar without prompting and can create an artist row', async () => {
    const { dataDir, imageDir, inbox } = await setupDirs();
    const file = path.join(inbox, 'mural.png');
    await writeFile(file, PNG);
    await writeFile(
      path.join(inbox, 'mural.json'),
      JSON.stringify({
        name: 'Exchange wall',
        category: 'graffiti',
        region: 'Exchange District',
        location: { lat: 49.8985, lon: -97.1403 },
        artist_name: 'Spray Kid',
        create_artist: true,
        description: 'North-facing wall.',
      }),
    );

    const results = await importFiles([file], {
      dataDir,
      imageDir,
      readExif: async () => ({}),
    });

    assert.deepEqual(results, { imported: 1, skipped: 0, artistsCreated: 1 });

    const arts = await readJsonl(path.join(dataDir, 'arts.jsonl'));
    const artists = await readJsonl(path.join(dataDir, 'artists.jsonl'));
    assert.equal(arts.length, 1);
    assert.equal(arts[0].id, '1');
    assert.equal(arts[0].name, 'Exchange wall');
    assert.equal(arts[0].category, 'graffiti');
    assert.equal(arts[0].region, 'Exchange District');
    assert.equal(arts[0].region_id, 'exchange-district');
    assert.equal(arts[0].artist_name, 'Spray Kid');
    assert.equal(arts[0].artist_id, '1');
    assert.equal(arts[0].image, '/images/arts/1.png');
    assert.equal(artists[0].name, 'Spray Kid');
  });

  it('skips a file whose contents were already imported', async () => {
    const { dataDir, imageDir, inbox } = await setupDirs();
    const file = path.join(inbox, 'piece.png');
    await writeFile(file, PNG);
    await writeFile(
      path.join(inbox, 'piece.json'),
      JSON.stringify({
        name: 'Once',
        category: 'outdoor-art',
        region: 'Osborne Village',
        location: { lat: 49.8738, lon: -97.1408 },
      }),
    );

    await importFiles([file], { dataDir, imageDir, readExif: async () => ({}) });
    const second = await importFiles([file], { dataDir, imageDir, readExif: async () => ({}) });
    assert.equal(second.imported, 0);
    assert.equal(second.skipped, 1);
    assert.equal((await readJsonl(path.join(dataDir, 'arts.jsonl'))).length, 1);
  });

  it('prompts only for missing fields and uses EXIF GPS when present', async () => {
    const { dataDir, imageDir, inbox } = await setupDirs();
    const file = path.join(inbox, 'untitled.png');
    await writeFile(file, PNG);

    const asked = [];
    const results = await importFiles([file], {
      dataDir,
      imageDir,
      readExif: async () => ({ location: { lat: 49.87, lon: -97.14 } }),
      prompt: {
        async ask(field) {
          asked.push(field);
          if (field === 'name') return 'Prompted name';
          if (field === 'category') return 'graffiti';
          if (field === 'region') return 'Wolseley';
          if (field === 'artist_name') return '';
          if (field === 'description') return '';
          throw new Error(`unexpected field ${field}`);
        },
        confirm: async () => false,
      },
    });

    assert.equal(results.imported, 1);
    assert.deepEqual(asked, ['name', 'category', 'region', 'artist_name', 'description']);
    const [art] = await readJsonl(path.join(dataDir, 'arts.jsonl'));
    assert.equal(art.name, 'Prompted name');
    assert.equal(art.region, 'Wolseley');
    assert.equal(art.artist_id, null);
    assert.deepEqual(art.location, { lat: 49.87, lon: -97.14 });
  });
});
