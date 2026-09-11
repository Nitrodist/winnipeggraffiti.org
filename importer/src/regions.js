import { slugify } from './slug.js';

/**
 * Canonical Winnipeg / Manitoba region centroids for map pages.
 * Names match the requested list exactly, including original spellings.
 */
const SEEDS = [
  ['The North End', 49.918, -97.135, 14],
  ['Luxton', 49.928, -97.122, 15],
  ["St. John's", 49.93, -97.132, 15],
  ['Burrows', 49.932, -97.148, 15],
  ['William Whyte', 49.912, -97.138, 15],
  ['The West End', 49.888, -97.175, 14],
  ['Minto', 49.882, -97.178, 15],
  ['Polo Park', 49.882, -97.198, 15],
  ['West Wolseley', 49.878, -97.178, 15],
  ['Daniel McIntyre', 49.89, -97.168, 15],
  ['Corydon Village', 49.87, -97.152, 15],
  ['Crescentwood', 49.862, -97.162, 15],
  ['West Broadway', 49.886, -97.155, 15],
  ['The Forks', 49.887, -97.131, 16],
  ['Chinatown', 49.9, -97.14, 16],
  ['Exchange District', 49.898, -97.138, 16],
  ['Point Douglas', 49.906, -97.128, 15],
  ['Weston', 49.908, -97.185, 15],
  ['Amber Trails', 49.957, -97.205, 15],
  ['Seven Oaks', 49.948, -97.128, 14],
  ['Glenelm', 49.908, -97.088, 15],
  ['Chalmers', 49.898, -97.082, 15],
  ['Windsor Park', 49.852, -97.078, 14],
  ['Linden Ridge', 49.838, -97.158, 15],
  ['Deer Lodge', 49.878, -97.228, 15],
  ['Varsity View', 49.818, -97.138, 15],
  ['Old Tuxedo', 49.868, -97.218, 15],
  ['Headingly', 49.876, -97.392, 13],
  ['Osborne Village', 49.877, -97.146, 16],
  ['St. Boniface', 49.888, -97.108, 14],
  ['Transcona', 49.895, -97.005, 13],
  ['St. James', 49.882, -97.218, 14],
  ['Garden City', 49.948, -97.152, 14],
  ['The Maples', 49.958, -97.172, 14],
  ['St. Vital', 49.848, -97.112, 13],
  ['Fort Garry', 49.822, -97.148, 13],
  ['Downtown', 49.895, -97.144, 15],
  ['Wolseley', 49.877, -97.168, 15],
  ['Elmwood', 49.912, -97.098, 14],
  ['Silver Heights', 49.878, -97.248, 15],
  ['Sturgeon Creek', 49.882, -97.268, 15],
  ['Assiniboia Downs', 49.882, -97.328, 14],
  ['Westwood', 49.872, -97.288, 14],
  ['Welington Crescent', 49.868, -97.172, 15],
  ['Charleswood', 49.852, -97.282, 13],
  ['Assiniboine Park', 49.872, -97.232, 15],
  ['Assiniboine Forest', 49.848, -97.258, 15],
  ['Tuxedo', 49.862, -97.218, 14],
  ['River Heights', 49.858, -97.172, 14],
  ['West Kildonan', 49.938, -97.132, 14],
  ['Tyndall Park', 49.932, -97.182, 14],
  ['Kildonan Park', 49.942, -97.098, 15],
  ['Riverdale', 49.868, -97.118, 15],
  ['Rivergrove', 49.928, -97.072, 15],
  ['North Kildonan', 49.938, -97.068, 14],
  ['East Kildonan', 49.918, -97.082, 14],
  ['Rossmere', 49.928, -97.088, 15],
  ['East Saint Paul', 49.978, -97.042, 13],
  ['West Saint Paul', 50.012, -97.078, 13],
  ['North Transcona', 49.912, -97.008, 14],
  ['Transcona Yards', 49.878, -97.028, 15],
  ['Symington Yards', 49.858, -97.048, 15],
  ['Sage Creek', 49.828, -97.018, 14],
  ['Island Lakes', 49.838, -97.048, 15],
  ['Southdale', 49.838, -97.082, 14],
  ['Fort Richmond', 49.798, -97.148, 15],
  ['Richmond West', 49.788, -97.162, 15],
  ['Waverley Heights', 49.818, -97.168, 15],
  ['University of Manitoba', 49.809, -97.133, 15],
  ['Kings Park', 49.798, -97.118, 15],
  ['St. Norbert', 49.762, -97.148, 14],
  ['Bridgwater', 49.788, -97.202, 14],
  ['Fort Whyte', 49.818, -97.202, 14],
  ['Waverley West', 49.798, -97.192, 14],
  ['South Point', 49.778, -97.182, 15],
  ['Linden Woods', 49.838, -97.192, 15],
  ['Whyte Ridge', 49.828, -97.192, 15],
  ['Grant Park', 49.854, -97.162, 15],
];

export const REGION_SEEDS = SEEDS;

/** @type {{id: string, name: string, location: {lat: number, lon: number}, zoom: number}[]} */
export const REGIONS = SEEDS.map(([name, lat, lon, zoom]) => ({
  id: slugify(name),
  name,
  location: { lat, lon },
  zoom,
}));

/**
 * @param {typeof REGIONS} regions
 * @param {string|null|undefined} value
 */
export function findRegion(regions, value) {
  if (!value) return null;
  const needle = String(value).trim().toLowerCase();
  const slug = slugify(value);
  return (
    regions.find((region) => region.id === needle) ??
    regions.find((region) => region.id === slug) ??
    regions.find((region) => region.name.toLowerCase() === needle) ??
    null
  );
}
