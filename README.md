# WinnipegGraffiti.org

A static catalogue of graffiti and outdoor art in Winnipeg and Manitoba. Built
with [Astro](https://astro.build) and deployed as an assets-only Cloudflare
Worker. Locations use [OpenStreetMap](https://www.openstreetmap.org).

The catalogue is a handful of [JSONL](https://jsonltools.com/what-is-jsonl)
files: one complete JSON value per line, one file per table. The site reads them
at build time. There is no server-side database.

## Quick start

Requires Node 20.6 or newer.

```bash
npm install
npm run seed       # writes data/regions.jsonl and data/categories.jsonl
npm run dev        # http://localhost:4321
npm run build      # site/dist/ as plain static HTML
```

## Data

| File                    | Table                                              |
| ----------------------- | -------------------------------------------------- |
| `data/arts.jsonl`       | One row per photographed piece                     |
| `data/artists.jsonl`    | Optional artist pages, joined from `arts.artist_id` |
| `data/regions.jsonl`    | Winnipeg neighbourhoods, with an OSM centre        |
| `data/categories.jsonl` | `graffiti` and `outdoor-art`                       |

An art row always stores an artist name (`artist` / `artist_name`) for display.
`artist_id` is optional: when it points at a row in `artists.jsonl`, the name
becomes a link to that artist’s page, which lists every piece of theirs. Graffiti
and outdoor art are separate category tags, never one mixed list.

Sample rows in `arts.jsonl` are placeholders so the maps and pages have something
to show; replace them by importing photographs.

Location is OpenStreetMap-compatible WGS84:

```json
{ "lat": 49.8985, "lon": -97.1403 }
```

## Importing photos

```bash
npm run import -- ./photos
```

The importer walks a directory (or a single file), copies images into
`site/public/images/arts/{id}.{ext}`, and appends a row to `arts.jsonl`. It reads
EXIF GPS and titles when they exist, and a sidecar `mural.json` next to
`mural.jpg`. Anything still missing is prompted for in the terminal: name,
category (graffiti or outdoor art), region, location (an OSM URL or `lat,lon`),
and optionally an artist name.

If the artist name matches an existing `artists.jsonl` row you can link it. If
not, you can create an artist page on the spot.

Sidecar example:

```json
{
  "name": "Band name piece",
  "category": "graffiti",
  "region": "Exchange District",
  "location": { "lat": 49.8985, "lon": -97.1403 },
  "artist_name": "Someone",
  "create_artist": true,
  "description": "North-facing wall on Albert."
}
```

`location` may also be an OpenStreetMap URL:

`https://www.openstreetmap.org/#map=18/49.8985/-97.1403`

Drop files in `inbox/` and run `npm run import` with no arguments to use that
folder.

## The site

| Route              | Contents                                              |
| ------------------ | ----------------------------------------------------- |
| `/`                | Latest five pieces and a map of every tagged location |
| `/map`             | City map plus every Winnipeg region                   |
| `/region/[slug]`   | Region map (centred there) and a table of pieces      |
| `/art/[id]`        | Photograph, record fields, and a map of the site      |
| `/artist/[id]`     | Artist record and their pieces                        |
| `/graffiti`        | Pieces tagged graffiti                                |
| `/outdoor-art`     | Pieces tagged outdoor art                             |

Set `WINNIPEG_DATA_DIR` to build against JSONL in a different directory.

## Deploying to Cloudflare

The site deploys as an **assets-only Worker** (Cloudflare Workers Static Assets).
Configuration lives in `wrangler.jsonc`, which points at `site/dist` and has no
`main`, because there is no server-side code.

Cloudflare Workers Builds settings:

| Setting        | Value                 |
| -------------- | --------------------- |
| Build command  | `npm run build`       |
| Deploy command | `npx wrangler deploy` |
| Root directory | repository root (`/`) |

Validate the config without deploying anything:

```bash
npm run build
npm run deploy:check   # wrangler deploy --dry-run
```

Deploy by hand:

```bash
npm run deploy
```

**`wrangler.jsonc` must be committed.** Without it, `wrangler deploy` falls back
to project auto-detection, which refuses to run at the root of an npm workspace.

**`data/*.jsonl` must be committed.** The site reads the tables at build time, so
JSONL is a build input, not a build artifact. `site/dist/` stays gitignored
because Cloudflare rebuilds it.

## Tests

```bash
npm test
```

## Layout

```
data/                     JSONL tables (committed)
importer/
  src/cli.js              `npm run import` entry
  src/import.js           directory walk, sidecar merge, JSONL append
  src/exif.js             GPS / title from photos
  src/location.js         OSM URL and lat,lon parsing
  src/regions.js          Winnipeg neighbourhood list
site/
  src/lib/data.js         build-time JSONL loader
  src/components/         map, table, cards
  src/pages/              routes
```
