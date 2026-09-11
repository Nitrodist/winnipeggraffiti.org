import { readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  WINNIPEG_CENTER,
  artHref,
  artistHref,
  categoryHref,
  categoryName,
  count,
  displayArtistName,
  formatCoords,
  formatDate,
  osmUrl,
  regionHref,
  slugify,
} from './format.js';

export {
  WINNIPEG_CENTER,
  artHref,
  artistHref,
  categoryHref,
  categoryName,
  count,
  displayArtistName,
  formatCoords,
  formatDate,
  osmUrl,
  regionHref,
  slugify,
};

/**
 * Build-time access to the JSONL tables.
 *
 * The site is fully static: these files are read once during `astro build`,
 * and nothing is fetched at request time.
 */

const DATA_DIR = process.env.WINNIPEG_DATA_DIR
  ? pathToFileURL(`${path.resolve(process.env.WINNIPEG_DATA_DIR)}/`)
  : new URL('../../../data/', import.meta.url);

const IMAGE_DIR = new URL('../../public/images/arts/', import.meta.url);

let cached = null;
let cachedDir = null;

function parseJsonl(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function readTable(name) {
  const url = new URL(name, DATA_DIR);
  let raw;
  try {
    raw = await readFile(url, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      if (name === 'regions.jsonl' || name === 'categories.jsonl') {
        throw new Error(
          `${name} not found at ${url.pathname}. Run \`npm run seed\` from the repo root.`,
        );
      }
      return [];
    }
    throw error;
  }
  return parseJsonl(raw);
}

function localImageMap() {
  const map = new Map();
  try {
    for (const file of readdirSync(fileURLToPath(IMAGE_DIR))) {
      const match = file.match(/^(\d+)\.(jpe?g|png|webp|gif)$/i);
      if (match) map.set(match[1], `/images/arts/${file}`);
    }
  } catch {
    // public/images/arts is created on the first import.
  }
  return map;
}

function newestFirst(a, b) {
  const at = a.created_at || a.importedAt || '';
  const bt = b.created_at || b.importedAt || '';
  return bt.localeCompare(at) || Number(b.id) - Number(a.id) || String(b.id).localeCompare(String(a.id));
}

function imageUrlFor(art, images) {
  if (art.image) {
    return art.image.startsWith('/') ? art.image : `/images/arts/${art.image}`;
  }
  return images.get(String(art.id)) || null;
}

/**
 * @returns {Promise<{
 *   arts: object[],
 *   artists: object[],
 *   regions: object[],
 *   categories: object[],
 *   stats: object,
 *   lastFive: object[],
 * }>}
 */
export async function loadSite() {
  const dirKey = DATA_DIR.href;
  if (cached && cachedDir === dirKey) return cached;

  const [artsRaw, artistsRaw, regions, categories] = await Promise.all([
    readTable('arts.jsonl'),
    readTable('artists.jsonl'),
    readTable('regions.jsonl'),
    readTable('categories.jsonl'),
  ]);

  const artistById = new Map(artistsRaw.map((artist) => [String(artist.id), artist]));
  const regionById = new Map(regions.map((region) => [region.id, region]));
  const images = localImageMap();

  const arts = artsRaw
    .map((art) => {
      const artistRecord = art.artist_id ? (artistById.get(String(art.artist_id)) ?? null) : null;
      const regionRecord =
        regionById.get(art.region_id) ??
        regions.find((row) => row.name === art.region) ??
        null;
      const artistName =
        (typeof art.artist === 'string' && art.artist) ||
        art.artist_name ||
        artistRecord?.name ||
        null;
      return {
        ...art,
        artist_name: artistName,
        artistRecord,
        region: regionRecord,
        imageUrl: imageUrlFor(art, images),
      };
    })
    .sort(newestFirst);

  const artists = artistsRaw
    .map((artist) => ({
      ...artist,
      arts: arts.filter((art) => art.artist_id && String(art.artist_id) === String(artist.id)),
    }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'en-CA'));

  const stats = {
    pieces: arts.length,
    artists: artists.length,
    graffiti: arts.filter((art) => art.category === 'graffiti').length,
    outdoorArt: arts.filter((art) => art.category === 'outdoor-art').length,
    regionsWithArt: new Set(arts.map((art) => art.region_id).filter(Boolean)).size,
    regions: regions.length,
  };

  cachedDir = dirKey;
  cached = {
    arts,
    artists,
    regions,
    categories,
    stats,
    lastFive: arts.slice(0, 5),
  };
  return cached;
}

export function artsInRegion(arts, region) {
  const id = region.id ?? region;
  const name = region.name;
  return arts.filter(
    (art) =>
      art.region_id === id ||
      art.region?.id === id ||
      art.region?.name === name ||
      art.region === name,
  );
}

export function artsInCategory(arts, slug) {
  return arts.filter((art) => art.category === slug);
}

export function mapMarkers(arts) {
  return arts
    .filter((art) => art.location?.lat != null && art.location?.lon != null)
    .map((art) => ({
      lat: art.location.lat,
      lon: art.location.lon,
      title: art.name,
      href: artHref(art),
      category: art.category,
    }));
}
