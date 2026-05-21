import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findBestMatchingVersion, satisfiesVersion } from '../src/node-version.utils';

describe('node-version utils', () => {
  it('matches exact versions whether the requirement includes a v prefix', () => {
    assert.equal(satisfiesVersion('v16.20.2', 'v16.20.2'), true);
    assert.equal(satisfiesVersion('16.20.2', 'v16.20.2'), true);
  });

  it('matches ranged versions when the requirement version includes a v prefix', () => {
    assert.equal(satisfiesVersion('v16.20.2', '>=v16.20.0'), true);
    assert.equal(satisfiesVersion('v16.20.2', '^v16.20.0'), true);
    assert.equal(satisfiesVersion('v16.20.2', '~v16.20.0'), true);
  });

  it('finds an installed version for v-prefixed exact requirements', () => {
    assert.equal(
      findBestMatchingVersion(['v20.19.5', 'v18.20.8', 'v16.20.2'], 'v16.20.2'),
      'v16.20.2',
    );
  });
});
