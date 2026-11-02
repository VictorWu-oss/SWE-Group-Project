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
    busynessStatus: 'unknown',
    reviewedToday: false,
    restroomType: null,
    amenities: null,
    accessibility: null,
    hours: null,
    timezone: null,
    openStatus: 'unknown',
    indoorDirections: null,
    safetyInfo: [],
    directoryVerified: false,
    verificationSource: null,
    verifiedAt: null,
    verifiedBy: null,
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
    busynessStatus: 'current',
    reviewedToday: false,
    restroomType: 'single-stall',
    amenities: { babyChanging: true, menstrualProducts: true, hooks: true, shelves: true },
    accessibility: {
      wheelchairAccessible: true,
      grabBars: true,
      accessibleSink: true,
      stepFreeRoute: true,
    },
    hours: null,
    timezone: null,
    openStatus: 'unknown',
    indoorDirections: null,
    safetyInfo: [],
    directoryVerified: true,
    verificationSource: 'Campus facilities',
    verifiedAt: '2026-10-01T10:00:00.000Z',
    verifiedBy: 'Facilities contact',
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

test('combined directory filters use only confirmed accessibility and amenities', () => {
  assert.deepEqual(
    filterAndSortBathrooms(bathroomFixtures, '', null, 'any', 'any', {
      restroomTypes: ['single-stall'],
      accessibility: ['wheelchairAccessible', 'stepFreeRoute'],
      amenities: ['babyChanging', 'menstrualProducts'],
      sort: 'rating',
    }).map(({ bathroom }) => bathroom.id),
    ['near'],
  );
  assert.deepEqual(
    filterAndSortBathrooms(bathroomFixtures, '', null, 'any', 'any', {
      restroomTypes: [],
      accessibility: ['wheelchairAccessible'],
      amenities: ['babyChanging'],
      sort: 'recommended',
    }).map(({ bathroom }) => bathroom.id),
    ['near'],
  );
  const unverifiedWithValues = {
    ...bathroomFixtures[0],
    restroomType: 'single-stall',
    amenities: { babyChanging: true, menstrualProducts: true, hooks: true, shelves: true },
    accessibility: {
      wheelchairAccessible: true,
      grabBars: true,
      accessibleSink: true,
      stepFreeRoute: true,
    },
  };
  assert.deepEqual(
    filterAndSortBathrooms([unverifiedWithValues], '', null, 'any', 'any', {
      restroomTypes: ['single-stall'],
      accessibility: ['wheelchairAccessible'],
      amenities: ['babyChanging'],
      sort: 'recommended',
    }),
    [],
  );
});

test('stale or unknown busyness does not match an active busyness filter', () => {
  const staleBathroom = {
    ...bathroomFixtures[1],
    busyness: 'High',
    busynessStatus: 'stale',
  };
  assert.deepEqual(
    filterAndSortBathrooms([staleBathroom], '', null, 'any', 'High'),
    [],
  );
});

test('distance labels avoid claiming a distance when location is unavailable', () => {
  assert.equal(formatDistance(null), 'Distance unavailable');
  assert.equal(formatDistance(0), '0 ft away');
  const missingCoordinates = { ...bathroomFixtures[0], latitude: null, longitude: null };
  assert.equal(
    filterAndSortBathrooms(
      [missingCoordinates],
      '',
      { latitude: 35.3, longitude: -120.66 },
    )[0].distanceKilometers,
    null,
  );
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
    busynessStatus: 'unknown',
    reviewedToday: false,
    restroomType: null,
    amenities: null,
    accessibility: null,
    hours: null,
    timezone: null,
    openStatus: 'unknown',
    indoorDirections: null,
    safetyInfo: [],
    directoryVerified: false,
    verificationSource: null,
    verifiedAt: null,
    verifiedBy: null,
  });
  assert.throws(
    () => parseBathroom({ ...fixture.bathroom, latitude: 100 }),
    /invalid latitude/,
  );
  assert.equal(parseBathroom({ ...fixture.bathroom, latitude: null, longitude: null }).latitude, null);
});
