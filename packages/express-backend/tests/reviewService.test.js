const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createDatabase, seedBathrooms } = require('../src/db/database');
const {
  ReviewConflictError,
  getBathroomSummary,
  getLosAngelesDay,
  submitReview,
} = require('../src/services/reviewService');

function makeDatabase() {
  const database = createDatabase(':memory:');
  seedBathrooms(database, [{
    id: 'demo-bathroom',
    name: 'Demo Bathroom',
    building: 'Demo Building',
    latitude: 35.3,
    longitude: -120.66,
    demo: true,
  }]);
  return database;
}

test('uses the America/Los_Angeles calendar day across UTC midnight', () => {
  assert.equal(getLosAngelesDay(new Date('2026-01-01T07:59:00.000Z')), '2025-12-31');
  assert.equal(getLosAngelesDay(new Date('2026-01-01T08:01:00.000Z')), '2026-01-01');
});

test('persists a review and rejects another review on the same LA day', () => {
  const database = makeDatabase();
  const now = new Date('2026-06-15T19:00:00.000Z');
  const bathroom = submitReview(database, {
    bathroomId: 'demo-bathroom',
    installationId: 'installation-12345678',
    cleanliness: 4,
    busyness: 'Medium',
  }, now);

  assert.equal(bathroom.averageCleanliness, 4);
  assert.equal(bathroom.reviewCount, 1);
  assert.equal(bathroom.reviewedToday, true);
  assert.equal(bathroom.busyness, 'Medium');
  assert.equal(bathroom.busynessReportedAt, now.toISOString());
  assert.throws(() => submitReview(database, {
    bathroomId: 'demo-bathroom',
    installationId: 'installation-12345678',
    cleanliness: 2,
    busyness: 'Low',
  }, new Date('2026-06-16T06:59:00.000Z')), ReviewConflictError);
  assert.equal(getBathroomSummary(database, 'demo-bathroom', '', now).reviewCount, 1);
  database.close();
});

test('allows a new review after the LA calendar day changes', () => {
  const database = makeDatabase();
  submitReview(database, {
    bathroomId: 'demo-bathroom',
    installationId: 'installation-12345678',
    cleanliness: 4,
    busyness: 'Low',
  }, new Date('2026-06-15T06:59:00.000Z'));

  const secondReview = submitReview(database, {
    bathroomId: 'demo-bathroom',
    installationId: 'installation-12345678',
    cleanliness: 5,
    busyness: 'High',
  }, new Date('2026-06-15T07:01:00.000Z'));

  assert.equal(secondReview.reviewCount, 2);
  assert.equal(secondReview.averageCleanliness, 4.5);
  database.close();
});

test('persists reviews after closing and reopening the SQLite file', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'toilet-tracker-'));
  const databasePath = path.join(directory, 'reviews.sqlite');
  const database = createDatabase(databasePath);
  seedBathrooms(database, [{
    id: 'demo-bathroom',
    name: 'Demo Bathroom',
    building: 'Demo Building',
    latitude: 35.3,
    longitude: -120.66,
    demo: true,
  }]);
  submitReview(database, {
    bathroomId: 'demo-bathroom',
    installationId: 'installation-12345678',
    cleanliness: 3,
    busyness: 'Low',
  }, new Date('2026-06-15T19:00:00.000Z'));

  database.close();

  const reopened = createDatabase(databasePath);
  const persisted = getBathroomSummary(reopened, 'demo-bathroom', '', new Date('2026-06-15T19:00:00.000Z'));
  assert.equal(persisted.reviewCount, 1);
  assert.equal(persisted.averageCleanliness, 3);
  reopened.close();
  fs.rmSync(directory, { recursive: true, force: true });
});