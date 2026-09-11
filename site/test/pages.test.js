import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { artsInCategory, loadSite } from '../src/lib/data.js';

const exec = promisify(execFile);
const siteRoot = fileURLToPath(new URL('..', import.meta.url));

async function readDist(relPath) {
  return readFile(new URL(`../dist/${relPath}`, import.meta.url), 'utf8');
}

let site;

before(async () => {
  await exec('npm', ['run', 'build'], {
    cwd: siteRoot,
    env: { ...process.env, PATH: process.env.PATH },
  });
  site = await loadSite();
});

describe('built pages', () => {
  it('the homepage lists the latest pieces and embeds an OpenStreetMap', async () => {
    const html = await readDist('index.html');
    assert.match(html, /Latest pieces/);
    assert.match(html, /data-osm-map/);
    for (const art of site.lastFive) {
      assert.match(html, new RegExp(art.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });

  it('the map page links to every region', async () => {
    const html = await readDist('map/index.html');
    assert.equal(site.regions.length, 78);
    for (const region of site.regions) {
      assert.match(html, new RegExp(`href="/region/${region.id}"`));
    }
  });

  it('a region page centres a map and tables its arts', async () => {
    const region = site.regions.find((row) =>
      site.arts.some((art) => art.region_id === row.id),
    );
    assert.ok(region, 'expected at least one region with art');
    const html = await readDist(`region/${region.id}/index.html`);
    assert.match(html, new RegExp(region.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, /data-osm-map/);
    const pieces = site.arts.filter((art) => art.region_id === region.id);
    for (const art of pieces) {
      assert.match(html, new RegExp(`href="/art/${art.id}"`));
    }
  });

  it('an art page shows fields and a map', async () => {
    const art = site.arts[0];
    assert.ok(art, 'expected at least one art record');
    const html = await readDist(`art/${art.id}/index.html`);
    assert.match(html, new RegExp(art.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, /data-osm-map/);
    assert.match(html, /OpenStreetMap/);
    if (art.artist_id) {
      assert.match(html, new RegExp(`href="/artist/${art.artist_id}"`));
    }
  });

  it('an artist page lists that artist’s pieces as links', async () => {
    const artist = site.artists.find((row) => row.arts.length > 0);
    assert.ok(artist);
    const html = await readDist(`artist/${artist.id}/index.html`);
    assert.match(html, new RegExp(artist.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    for (const art of artist.arts) {
      assert.match(html, new RegExp(`href="/art/${art.id}"`));
    }
  });

  it('builds separate graffiti and outdoor-art pages', async () => {
    for (const slug of ['graffiti', 'outdoor-art']) {
      const html = await readDist(`${slug}/index.html`);
      const pieces = artsInCategory(site.arts, slug);
      for (const art of pieces) {
        assert.match(html, new RegExp(`href="/art/${art.id}"`));
      }
    }
  });
});
