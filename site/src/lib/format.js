export const WINNIPEG_CENTER = { lat: 49.8954, lon: -97.1385 };

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function artHref(art) {
  return art?.id ? `/art/${art.id}` : '#';
}

export function artistHref(artist) {
  return artist?.id ? `/artist/${artist.id}` : '#';
}

export function regionHref(region) {
  const id = typeof region === 'string' ? region : region?.id;
  return id ? `/region/${id}` : '/map';
}

export function categoryHref(slug) {
  if (slug === 'graffiti') return '/graffiti';
  if (slug === 'outdoor-art') return '/outdoor-art';
  return '/categories';
}

export function categoryName(slug) {
  if (slug === 'graffiti') return 'Graffiti';
  if (slug === 'outdoor-art') return 'Outdoor art';
  return slug;
}

/** Artist name shown on an art record; linked when artist_id resolves. */
export function displayArtistName(art) {
  if (!art) return null;
  if (typeof art.artist === 'string' && art.artist.trim()) return art.artist;
  if (typeof art.artist_name === 'string' && art.artist_name.trim()) return art.artist_name;
  if (art.artistRecord?.name) return art.artistRecord.name;
  if (art.artist?.name) return art.artist.name;
  return null;
}

export function osmUrl(location, zoom = 17) {
  if (!location) return 'https://www.openstreetmap.org/#map=12/49.8954/-97.1385';
  const { lat, lon } = location;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;
}

export function formatDate(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/** "1 piece" / "12 pieces" */
export function count(value, singular = 'piece', plural = `${singular}s`) {
  const n = Number(value) || 0;
  return `${n.toLocaleString('en-CA')} ${n === 1 ? singular : plural}`;
}

export function formatCoords(location) {
  if (!location || location.lat == null || location.lon == null) return '—';
  return `${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}`;
}
