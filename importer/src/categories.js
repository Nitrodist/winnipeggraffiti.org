/** The two catalogue tags. Stored on each art record as `category`. */
export const CATEGORIES = [
  { slug: 'graffiti', name: 'Graffiti' },
  { slug: 'outdoor-art', name: 'Outdoor art' },
];

export const CATEGORY_SLUGS = CATEGORIES.map((category) => category.slug);

/**
 * @param {string} value
 * @returns {{slug: string, name: string}|null}
 */
export function parseCategory(value) {
  if (!value) return null;
  const needle = String(value)
    .trim()
    .toLowerCase()
    .replace(/[_ ]+/g, '-');
  const aliases = {
    graffiti: 'graffiti',
    'outdoor-art': 'outdoor-art',
    outdoorart: 'outdoor-art',
    outdoor: 'outdoor-art',
    mural: 'outdoor-art',
    sculpture: 'outdoor-art',
  };
  const slug = aliases[needle];
  return CATEGORIES.find((category) => category.slug === slug) ?? null;
}

/**
 * @param {string} slug
 */
export function categoryName(slug) {
  return CATEGORIES.find((category) => category.slug === slug)?.name ?? slug;
}
