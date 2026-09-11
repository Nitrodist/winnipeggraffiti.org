import exifr from 'exifr';

import { parseLocation } from './location.js';

/**
 * Pull whatever an image file already knows: GPS (as OSM lat/lon), a title,
 * a caption, and the time it was photographed.
 *
 * @param {string} file
 */
export async function readExif(file) {
  let parsed;
  try {
    parsed = await exifr.parse(file, {
      gps: true,
      exif: true,
      iptc: true,
      xmp: true,
      translateKeys: true,
      translateValues: true,
    });
  } catch {
    parsed = null;
  }

  if (!parsed) return {};

  const location = parseLocation({
    lat: parsed.latitude,
    lon: parsed.longitude,
  });

  const title =
    firstString(
      parsed.ObjectName,
      parsed.title,
      parsed.Headline,
      parsed.XPTitle,
      parsed.ImageDescription,
    ) ?? null;

  const description =
    firstString(parsed.Caption, parsed.description, parsed.ImageDescription, parsed.XPComment) ??
    null;

  const photographed = parsed.DateTimeOriginal ?? parsed.CreateDate ?? parsed.DateCreated ?? null;
  const photographed_at =
    photographed instanceof Date && !Number.isNaN(photographed.getTime())
      ? photographed.toISOString()
      : typeof photographed === 'string'
        ? photographed
        : null;

  return {
    location,
    title: title && title !== description ? title : title,
    description,
    photographed_at,
  };
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
