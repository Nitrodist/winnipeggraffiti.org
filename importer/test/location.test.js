import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatLocation, osmUrl, parseLocation } from '../src/location.js';

describe('parseLocation', () => {
  it('reads an OSM hash URL', () => {
    assert.deepEqual(
      parseLocation('https://www.openstreetmap.org/#map=18/49.8985/-97.1403'),
      { lat: 49.8985, lon: -97.1403 },
    );
  });

  it('reads mlat/mlon query parameters', () => {
    assert.deepEqual(
      parseLocation('https://www.openstreetmap.org/?mlat=49.8874&mlon=-97.1312#map=17/49.8874/-97.1312'),
      { lat: 49.8874, lon: -97.1312 },
    );
  });

  it('reads a lat,lon pair', () => {
    assert.deepEqual(parseLocation('49.8954, -97.1385'), { lat: 49.8954, lon: -97.1385 });
  });

  it('reads geo: URIs and lat/lon objects', () => {
    assert.deepEqual(parseLocation('geo:49.87,-97.14'), { lat: 49.87, lon: -97.14 });
    assert.deepEqual(parseLocation({ latitude: 49.87, longitude: -97.14 }), {
      lat: 49.87,
      lon: -97.14,
    });
    assert.deepEqual(parseLocation({ lat: 49.87, lng: -97.14 }), { lat: 49.87, lon: -97.14 });
  });

  it('rejects impossible coordinates', () => {
    assert.equal(parseLocation('99, 0'), null);
    assert.equal(parseLocation('not a place'), null);
    assert.equal(parseLocation(null), null);
  });
});

describe('osmUrl', () => {
  it('builds a marker URL OpenStreetMap understands', () => {
    const url = osmUrl({ lat: 49.8985, lon: -97.1403 }, 16);
    assert.match(url, /mlat=49\.8985/);
    assert.match(url, /mlon=-97\.1403/);
    assert.equal(formatLocation({ lat: 49.9, lon: -97.1 }), '49.9, -97.1');
  });
});
