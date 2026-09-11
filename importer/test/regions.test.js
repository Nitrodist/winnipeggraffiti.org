import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findRegion, REGION_SEEDS, REGIONS } from '../src/regions.js';
import { slugify } from '../src/slug.js';

const NAMES = `
The North End
Luxton
St. John's
Burrows
William Whyte
The West End
Minto
Polo Park
West Wolseley
Daniel McIntyre
Corydon Village
Crescentwood
West Broadway
The Forks
Chinatown
Exchange District
Point Douglas
Weston
Amber Trails
Seven Oaks
Glenelm
Chalmers
Windsor Park
Linden Ridge
Deer Lodge
Varsity View
Old Tuxedo
Headingly
Osborne Village
St. Boniface
Transcona
St. James
Garden City
The Maples
St. Vital
Fort Garry
Downtown
Wolseley
Elmwood
Silver Heights
Sturgeon Creek
Assiniboia Downs
Westwood
Welington Crescent
Charleswood
Assiniboine Park
Assiniboine Forest
Tuxedo
River Heights
West Kildonan
Tyndall Park
Kildonan Park
Riverdale
Rivergrove
North Kildonan
East Kildonan
Rossmere
East Saint Paul
West Saint Paul
North Transcona
Transcona Yards
Symington Yards
Sage Creek
Island Lakes
Southdale
Fort Richmond
Richmond West
Waverley Heights
University of Manitoba
Kings Park
St. Norbert
Bridgwater
Fort Whyte
Waverley West
South Point
Linden Woods
Whyte Ridge
Grant Park
`
  .trim()
  .split('\n');

describe('Winnipeg regions', () => {
  it('includes every requested neighbourhood name exactly once', () => {
    assert.deepEqual(
      REGIONS.map((region) => region.name),
      NAMES,
    );
    assert.equal(REGION_SEEDS.length, 78);
  });

  it('gives each region a unique slug id and an OSM lat/lon centre', () => {
    const ids = REGIONS.map((region) => region.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const region of REGIONS) {
      assert.equal(region.id, slugify(region.name));
      assert.ok(region.location.lat > 49 && region.location.lat < 51);
      assert.ok(region.location.lon < -96 && region.location.lon > -98);
    }
  });

  it('finds a region by name or slug', () => {
    assert.equal(findRegion(REGIONS, 'Exchange District')?.id, 'exchange-district');
    assert.equal(findRegion(REGIONS, "st. john's")?.name, "St. John's");
    assert.equal(findRegion(REGIONS, 'nope'), null);
  });
});
