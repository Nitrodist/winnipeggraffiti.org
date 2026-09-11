import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { categoryName, parseCategory } from '../src/categories.js';

describe('categories', () => {
  it('accepts graffiti and outdoor art under a few aliases', () => {
    assert.equal(parseCategory('graffiti')?.slug, 'graffiti');
    assert.equal(parseCategory('Outdoor art')?.slug, 'outdoor-art');
    assert.equal(parseCategory('outdoor_art')?.slug, 'outdoor-art');
    assert.equal(parseCategory('mural')?.slug, 'outdoor-art');
    assert.equal(parseCategory('nope'), null);
  });

  it('returns the display name for a slug', () => {
    assert.equal(categoryName('graffiti'), 'Graffiti');
    assert.equal(categoryName('outdoor-art'), 'Outdoor art');
  });
});
