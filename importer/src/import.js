import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import { parseCategory } from './categories.js';
import { nextId } from './ids.js';
import { JsonlWriter, readJsonl } from './jsonl.js';
import { parseLocation } from './location.js';
import { findRegion } from './regions.js';
import { slugify } from './slug.js';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

/**
 * @param {string} file
 */
export function isImageFile(file) {
  return IMAGE_EXT.has(path.extname(file).toLowerCase());
}

/**
 * Recursively list image files under `dir`, or return `[dir]` if it is a file.
 *
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
export async function listImages(dir) {
  const info = await stat(dir);
  if (info.isFile()) {
    if (!isImageFile(dir)) {
      throw new Error(`${dir} is not a jpg/png/webp/gif image`);
    }
    return [dir];
  }

  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listImages(full)));
    } else if (entry.isFile() && isImageFile(entry.name)) {
      files.push(full);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

/**
 * @param {string} imagePath
 */
export function sidecarPath(imagePath) {
  const ext = path.extname(imagePath);
  return `${imagePath.slice(0, -ext.length)}.json`;
}

/**
 * @param {string} imagePath
 */
export async function readSidecar(imagePath) {
  try {
    const text = await readFile(sidecarPath(imagePath), 'utf8');
    return JSON.parse(text);
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw new Error(`${sidecarPath(imagePath)} is not valid JSON: ${error.message}`);
  }
}

/**
 * @param {string} file
 */
export function nameFromFile(file) {
  return path
    .basename(file, path.extname(file))
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Combine EXIF, sidecar JSON, and the filename into a partial art draft.
 * Sidecar values win; EXIF fills GPS/title; the filename is only a name hint.
 *
 * @param {{file: string, exif?: object, sidecar?: object}} input
 */
export function mergeDraft({ file, exif = {}, sidecar = {} }) {
  const sidecarLocation =
    parseLocation(sidecar.location) ??
    parseLocation({ lat: sidecar.lat, lon: sidecar.lon ?? sidecar.lng });

  const category = parseCategory(sidecar.category)?.slug ?? null;
  const name = firstString(sidecar.name, sidecar.title, exif.title);
  const artist_name = firstString(sidecar.artist_name, sidecar.artist) ?? null;
  const description = firstString(sidecar.description, exif.description);

  return {
    file,
    source_file: path.basename(file),
    name: name ?? '',
    nameFromFile: nameFromFile(file),
    artist_name,
    artist_id: sidecar.artist_id != null ? String(sidecar.artist_id) : null,
    create_artist: Boolean(sidecar.create_artist),
    location: sidecarLocation ?? exif.location ?? null,
    region: sidecar.region ?? null,
    category,
    description: description ?? null,
    photographed_at: sidecar.photographed_at ?? exif.photographed_at ?? null,
    bio: firstString(sidecar.artist_bio, sidecar.bio),
    website: firstString(sidecar.website, sidecar.artist_website),
    instagram: firstString(sidecar.instagram, sidecar.artist_instagram),
  };
}

/**
 * Required fields that still need a value before the row can be written.
 *
 * @param {object} draft
 */
export function missingFields(draft) {
  const missing = [];
  if (!draft.name) missing.push('name');
  if (!draft.category) missing.push('category');
  if (!draft.region) missing.push('region');
  if (!draft.location) missing.push('location');
  return missing;
}

/**
 * @param {string} file
 */
export async function fileHash(file) {
  const buffer = await readFile(file);
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Import image files into arts.jsonl / artists.jsonl and copy them into the
 * site's public image directory.
 *
 * `prompt` is called for missing required fields and for optional artist /
 * description when the sidecar did not supply them. Tests inject a fake.
 *
 * @param {string[]} files
 * @param {object} options
 */
export async function importFiles(files, options) {
  const {
    dataDir,
    imageDir,
    prompt,
    now = () => new Date().toISOString(),
    log = () => {},
    readExif,
  } = options;

  if (typeof readExif !== 'function') {
    throw new Error('importFiles requires options.readExif');
  }

  const artsPath = path.join(dataDir, 'arts.jsonl');
  const artistsPath = path.join(dataDir, 'artists.jsonl');
  const regions = await readJsonl(path.join(dataDir, 'regions.jsonl'));

  if (regions.length === 0) {
    throw new Error(`regions.jsonl is empty at ${path.join(dataDir, 'regions.jsonl')}`);
  }

  const arts = await readJsonl(artsPath);
  const artists = await readJsonl(artistsPath);
  const knownHashes = new Set(arts.map((art) => art.source_sha256).filter(Boolean));

  const artsWriter = new JsonlWriter(artsPath, { append: true });
  const artistsWriter = new JsonlWriter(artistsPath, { append: true });

  const results = { imported: 0, skipped: 0, artistsCreated: 0 };

  try {
    await mkdir(imageDir, { recursive: true });

    for (const file of files) {
      const sha256 = await fileHash(file);
      if (knownHashes.has(sha256)) {
        log(`Skipping ${path.basename(file)} (already imported)`);
        results.skipped += 1;
        continue;
      }

      const exif = await readExif(file);
      const sidecar = await readSidecar(file);
      let draft = mergeDraft({ file, exif, sidecar });

      log(`\n--- ${path.basename(file)} ---`);
      if (draft.location) log(`GPS: ${draft.location.lat}, ${draft.location.lon}`);
      if (draft.name) log(`Name: ${draft.name}`);
      if (draft.category) log(`Category: ${draft.category}`);
      if (draft.region) log(`Region: ${draft.region}`);

      if (prompt) {
        draft = await fillWithPrompt(draft, {
          prompt,
          regions,
          artists,
          sidecar,
        });
      }

      const region = findRegion(regions, draft.region);
      if (region) {
        draft.region = region.name;
        draft.region_id = region.id;
      }

      const missing = missingFields(draft);
      if (missing.length > 0) {
        throw new Error(
          `${path.basename(file)} is missing ${missing.join(', ')}. ` +
            'Pass a sidecar .json or run interactively in a terminal.',
        );
      }

      if (!findRegion(regions, draft.region)) {
        throw new Error(
          `${path.basename(file)} has unknown region "${draft.region}". ` +
            'Use a name from data/regions.jsonl.',
        );
      }

      const created = await resolveArtist(draft, { artists, prompt, now, sidecar });
      if (created) {
        artists.push(created);
        await artistsWriter.write(created);
        results.artistsCreated += 1;
        log(`Created artist #${created.id} ${created.name}`);
      }

      const id = nextId(arts);
      const ext = path.extname(file).toLowerCase();
      const imageName = `${id}${ext}`;
      await copyFile(file, path.join(imageDir, imageName));

      const timestamp = now();
      const art = {
        id,
        name: draft.name,
        artist: draft.artist_name || null,
        artist_name: draft.artist_name || null,
        artist_id: draft.artist_id || null,
        location: {
          lat: draft.location.lat,
          lon: draft.location.lon,
        },
        region: draft.region,
        region_id: draft.region_id ?? slugify(draft.region),
        category: draft.category,
        description: draft.description || null,
        image: `/images/arts/${imageName}`,
        source_file: draft.source_file,
        source_sha256: sha256,
        photographed_at: draft.photographed_at || null,
        created_at: timestamp,
        updated_at: timestamp,
      };

      arts.push(art);
      knownHashes.add(sha256);
      await artsWriter.write(art);
      results.imported += 1;
      log(`Saved art #${id} ${art.name}`);
    }
  } finally {
    await artsWriter.close();
    await artistsWriter.close();
  }

  return results;
}

/**
 * @param {object} draft
 * @param {object} ctx
 */
async function fillWithPrompt(draft, { prompt, regions, artists, sidecar }) {
  const next = { ...draft };

  if (!next.name) {
    next.name = await prompt.ask('name', next);
  }
  if (!next.category) {
    next.category = await prompt.ask('category', next);
  }
  if (!next.region) {
    next.region = await prompt.ask('region', next);
  }
  if (!next.location) {
    next.location = await prompt.ask('location', next);
  }

  if (!Object.hasOwn(sidecar, 'artist_name') && !Object.hasOwn(sidecar, 'artist') && !next.artist_name) {
    const artist_name = await prompt.ask('artist_name', next);
    if (artist_name) next.artist_name = artist_name;
  }

  if (!Object.hasOwn(sidecar, 'description') && !next.description) {
    const description = await prompt.ask('description', next);
    if (description) next.description = description;
  }

  void regions;
  void artists;
  return next;
}

/**
 * Link an existing artist, or create one when asked.
 *
 * @param {object} draft
 * @param {object} ctx
 */
async function resolveArtist(draft, { artists, prompt, now, sidecar }) {
  if (draft.artist_id) {
    const existing = artists.find((artist) => String(artist.id) === String(draft.artist_id));
    if (!existing) {
      throw new Error(`artist_id ${draft.artist_id} does not match any row in artists.jsonl`);
    }
    if (!draft.artist_name) draft.artist_name = existing.name;
    return null;
  }

  if (!draft.artist_name) return null;

  const match = artists.find(
    (artist) => artist.name.toLowerCase() === draft.artist_name.toLowerCase(),
  );

  if (match) {
    const shouldLink = draft.create_artist
      ? true
      : prompt
        ? await prompt.confirm(`Link to existing artist “${match.name}”?`, true)
        : true;
    if (shouldLink) {
      draft.artist_id = String(match.id);
    }
    return null;
  }

  const shouldCreate = draft.create_artist
    ? true
    : prompt
      ? await prompt.confirm(`Create an artist page for “${draft.artist_name}”?`, false)
      : false;

  if (!shouldCreate) return null;

  const created = {
    id: nextId(artists),
    name: draft.artist_name,
    bio: draft.bio || null,
    website: draft.website || null,
    instagram: draft.instagram || null,
    created_at: now(),
    updated_at: now(),
  };
  draft.artist_id = created.id;
  void sidecar;
  return created;
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}
