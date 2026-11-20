const assert = require('node:assert/strict');
const test = require('node:test');
const { createDatabase, seedBathrooms } = require('../src/db/database');
const {
  createMaintenanceReport,
  updateMaintenanceStatus,
  validateMaintenanceDescription,
} = require('../src/services/maintenanceService');

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

test('rejects a maintenance report with an unsupported category', () => {
  const database = makeDatabase();

  assert.throws(() => createMaintenanceReport(database, 'demo-bathroom', {
    installationId: 'installation-12345678',
    category: 'plumbing',
    description: 'The sink is leaking.',
  }), (error) => error.statusCode === 400
    && error.message === 'Category must be one of: cleanliness, supplies, fixture, accessibility, safety, other.');

  database.close();
});

test('rejects descriptions shorter than five Unicode characters', () => {
  const database = makeDatabase();

  assert.throws(() => createMaintenanceReport(database, 'demo-bathroom', {
    installationId: 'installation-12345678',
    category: 'fixture',
    description: '🔧🔧🔧🔧',
  }), (error) => error.statusCode === 400
    && error.message === 'Description must contain between 5 and 500 characters.');

  database.close();
});

test('accepts descriptions at the five-character minimum', () => {
  assert.equal(validateMaintenanceDescription('  🔧a bc  '), '🔧a bc');
});

test('accepts and rejects descriptions at the 500-character limit', () => {
  assert.equal(validateMaintenanceDescription('x'.repeat(500)).length, 500);
  assert.throws(() => validateMaintenanceDescription('x'.repeat(501)), (error) => error.statusCode === 400
    && error.message === 'Description must contain between 5 and 500 characters.');
});

test('rejects non-string descriptions', () => {
  assert.throws(() => validateMaintenanceDescription(null), (error) => error.statusCode === 400
    && error.message === 'Description must contain between 5 and 500 characters.');
});

test('persists a trimmed maintenance report with its initial open status', () => {
  const database = makeDatabase();
  const now = new Date('2026-06-15T19:00:00.000Z');

  const report = createMaintenanceReport(database, 'demo-bathroom', {
    installationId: 'installation-12345678',
    category: 'fixture',
    description: '  The soap dispenser is empty.  ',
  }, now);

  assert.deepEqual(report, {
    id: 1,
    bathroomId: 'demo-bathroom',
    category: 'fixture',
    description: 'The soap dispenser is empty.',
    status: 'open',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  database.close();
});

test('rejects an invalid maintenance status before updating a report', () => {
  const database = makeDatabase();

  assert.throws(() => updateMaintenanceStatus(database, 99, { status: 'closed' }), (error) => error.statusCode === 400
    && error.message === 'Status must be one of: open, in_progress, resolved, dismissed.');

  database.close();
});
