/**
 * URL-safe slug: "St. John's" → "st-johns", "The North End" → "the-north-end".
 *
 * @param {string} value
 */
export function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
