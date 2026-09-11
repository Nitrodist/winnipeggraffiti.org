import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { artsInCategory, artsInRegion, loadSite, mapMarkers } from '../src/lib/data.js';
import { categoryHref, displayArtistName, slugify } from '../src/lib/format.js';

describe('catalogue data', () => {
  it('loads the seeded Winnipeg regions', async () => {
    const { regions, arts, stats } = await loadSite();
    assert.equal(regions.length, 78);
    assert.equal(new Set(regions.map((region) => region.id)).size, 78);
    assert.ok(regions.some((region) => region.id === 'exchange-district'));
    assert.equal(stats.regions, 78);
    assert.ok(Array.isArray(arts));
  });

  it('filters arts by region and category', async () => {
    const { regions, arts } = await loadSite();
    const exchange = regions.find((region) => region.id === 'exchange-district');
    const inExchange = artsInRegion(arts, exchange);
    assert.ok(
      inExchange.every(
        (art) =>
          art.region_id === 'exchange-district' || art.region?.id === 'exchange-district',
      ),
    );
    assert.ok(artsInCategory(arts, 'graffiti').every((art) => art.category === 'graffiti'));
    assert.ok(artsInCategory(arts, 'outdoor-art').every((art) => art.category === 'outdoor-art'));
  });

  it('builds map markers only for pieces with coordinates', async () => {
    const { arts } = await loadSite();
    const markers = mapMarkers(arts);
    assert.equal(
      markers.length,
      arts.filter((art) => art.location?.lat != null && art.location?.lon != null).length,
    );
    for (const marker of markers) {
      assert.ok(marker.href.startsWith('/art/'));
    }
  });
});

describe('format helpers', () => {
  it('slugifies neighbourhood names the same way as region ids', () => {
    assert.equal(slugify("St. John's"), 'st-johns');
    assert.equal(slugify('The North End'), 'the-north-end');
    assert.equal(slugify('University of Manitoba'), 'university-of-manitoba');
  });

  it('links artist names only when an artist record is present', () => {
    assert.equal(displayArtistName({ artist_name: 'Ada' }), 'Ada');
    assert.equal(displayArtistName({ artist_name: null, artist: { name: 'Bea' } }), 'Bea');
    assert.equal(categoryHref('graffiti'), '/graffiti');
    assert.equal(categoryHref('outdoor-art'), '/outdoor-art');
  });
});
