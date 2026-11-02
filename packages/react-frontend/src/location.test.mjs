import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceBetween, formatDistance, sortBathrooms } from './location.js';

const bathrooms = [
  { id: 'b', name: 'West Bathroom', building: 'Union', latitude: 35.31, longitude: -120.66 },
  { id: 'a', name: 'East Bathroom', building: 'Library', latitude: 35.3, longitude: -120.66 },
  { id: 'missing', name: 'No Map Bathroom', building: 'Gym', latitude: null, longitude: null },
];

test('location helpers calculate zero distance', () => {
  assert.equal(distanceBetween({ latitude: 35.3, longitude: -120.66 }, { latitude: 35.3, longitude: -120.66 }), 0);
});

test('location helpers sort alphabetically without location and by distance with location', () => {
  assert.deepEqual(sortBathrooms(bathrooms, '', null).map(({ bathroom }) => bathroom.id), ['a', 'missing', 'b']);
  assert.deepEqual(sortBathrooms(bathrooms, '', { latitude: 35.3, longitude: -120.66 }).map(({ bathroom }) => bathroom.id), ['a', 'b', 'missing']);
});

test('location helpers filter and expose missing distance', () => {
  assert.deepEqual(sortBathrooms(bathrooms, 'library', null).map(({ bathroom }) => bathroom.id), ['a']);
  assert.equal(formatDistance(null), 'Distance unavailable');
});
