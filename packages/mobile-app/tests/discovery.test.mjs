import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { distanceBetween, filterAndSortBathrooms, formatDistance } from '../src/main/discovery.ts';
import { parseBathroom } from '../src/main/types.ts';

const bathroomFixtures = [
  {
    id: 'far',
    name: 'West Bathroom',
    building: 'Union',
    latitude: 35.31,
    longitude: -120.66,
    demo: true,
    averageCleanliness: null,
    reviewCount: 0,
    busyness: null,
    busynessReportedAt: null,
    reviewedToday: false,
  },
  {
    id: 'near',
    name: 'East Bathroom',
    building: 'Library',
    latitude: 35.3,
    longitude: -120.66,
    demo: false,
    averageCleanliness: 4.5,
    reviewCount: 2,
    busyness: 'Low',
    busynessReportedAt: '2026-10-01T10:00:00.000Z',
    reviewedToday: false,
  },
];

test('haversine distance returns kilometers and is zero for matching points', () => {
  assert.equal(distanceBetween(
    { latitude: 35.3, longitude: -120.66 },
    { latitude: 35.3, longitude: -120.66 },
  ), 0);
  assert.ok(distanceBetween(
    { latitude: 0, longitude: 0 },
    { latitude: 1, longitude: 0 },
  ) > 111 && distanceBetween(
    { latitude: 0, longitude: 0 },
    { latitude: 1, longitude: 0 },
  ) < 112);
});

test('search matches bathroom names and buildings and removes nonmatches', () => {
  assert.deepEqual(
    filterAndSortBathrooms(bathroomFixtures, 'LIBRARY', null).map(({ bathroom }) => bathroom.id),
    ['near'],
  );
  assert.deepEqual(filterAndSortBathrooms(bathroomFixtures, 'missing', null), []);
});

test('results sort by distance with location and alphabetically without location', () => {
  assert.deepEqual(
    filterAndSortBathrooms(
      bathroomFixtures,
      '',
      { latitude: 35.3, longitude: -120.66 },
    ).map(({ bathroom }) => bathroom.id),
    ['near', 'far'],
  );
  assert.deepEqual(
    filterAndSortBathrooms(bathroomFixtures, '', null).map(({ bathroom }) => bathroom.id),
    ['near', 'far'],
  );
});

test('rating filters include only bathrooms with matching community reports', () => {
  assert.deepEqual(
    filterAndSortBathrooms(bathroomFixtures, '', null, 'four-plus', 'Low')
      .map(({ bathroom }) => bathroom.id),
    ['near'],
  );
  assert.deepEqual(
    filterAndSortBathrooms(bathroomFixtures, '', null, 'four-plus', 'High'),
    [],
  );
  assert.deepEqual(
    filterAndSortBathrooms(bathroomFixtures, '', null, 'any', 'any')
      .map(({ bathroom }) => bathroom.id),
    ['near', 'far'],
  );
});

test('distance labels avoid claiming a distance when location is unavailable', () => {
  assert.equal(formatDistance(null), 'Distance unavailable');
  assert.equal(formatDistance(0), '0 ft away');
});

test('bathroom parsing accepts omitted optional fields but rejects invalid coordinates', () => {
  const fixture = JSON.parse(readFileSync(
    new URL('./fixtures/bathroom-missing-optionals.json', import.meta.url),
    'utf8',
  ));
  assert.deepEqual(parseBathroom(fixture.bathroom), {
    id: 'demo-optional-fields',
    name: 'Demo Bathroom',
    building: 'Demo Building',
    latitude: 35.3,
    longitude: -120.66,
    demo: true,
    averageCleanliness: null,
    reviewCount: 0,
    busyness: null,
    busynessReportedAt: null,
    reviewedToday: false,
  });
  assert.throws(
    () => parseBathroom({ ...fixture.bathroom, latitude: 100 }),
    /invalid location or identity fields/,
  );
});
