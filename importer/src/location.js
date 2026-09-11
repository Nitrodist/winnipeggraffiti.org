/**
 * Parse an OpenStreetMap-compatible location into `{ lat, lon }`.
 *
 * Accepts:
 * - `{ lat, lon }` / `{ lat, lng }` / `{ latitude, longitude }`
 * - `"lat, lon"` or `"lat lon"`
 * - OSM hash URLs: `https://www.openstreetmap.org/#map=18/49.8951/-97.1384`
 * - OSM marker query: `?mlat=49.8951&mlon=-97.1384`
 * - `geo:49.8951,-97.1384`
 *
 * @param {unknown} value
 * @returns {{lat: number, lon: number}|null}
 */
export function parseLocation(value) {
  if (value == null || value === '') return null;

  if (typeof value === 'object') {
    const lat = coerceNumber(value.lat ?? value.latitude);
    const lon = coerceNumber(value.lon ?? value.lng ?? value.longitude);
    return valid(lat, lon);
  }

  const text = String(value).trim();
  if (!text) return null;

  const hashMap = text.match(/#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/);
  if (hashMap) return valid(Number(hashMap[1]), Number(hashMap[2]));

  const mlat = text.match(/[?&#]mlat=(-?\d+(?:\.\d+)?)/i);
  const mlon = text.match(/[?&#]mlon=(-?\d+(?:\.\d+)?)/i);
  if (mlat && mlon) return valid(Number(mlat[1]), Number(mlon[1]));

  const geo = text.match(/^geo:(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i);
  if (geo) return valid(Number(geo[1]), Number(geo[2]));

  const pair = text.match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (pair) return valid(Number(pair[1]), Number(pair[2]));

  return null;
}

/**
 * @param {{lat: number, lon: number}|null|undefined} location
 */
export function formatLocation(location) {
  if (!location || location.lat == null || location.lon == null) return '';
  return `${location.lat}, ${location.lon}`;
}

/**
 * OSM site URL with a marker, suitable as the canonical public link.
 *
 * @param {{lat: number, lon: number}} location
 * @param {number} [zoom]
 */
export function osmUrl(location, zoom = 17) {
  const { lat, lon } = location;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;
}

function coerceNumber(value) {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function valid(lat, lon) {
  if (lat == null || lon == null) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}
