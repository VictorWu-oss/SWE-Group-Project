const assert = require('node:assert/strict');
const test = require('node:test');
const { DatabaseSync } = require('node:sqlite');
const { createApiApp } = require('../src/app');
const { createDatabase, migrateBathroomDirectory, seedBathrooms } = require('../src/db/database');
const { getBusynessStatus, getOpenStatus, validateHours } = require('../src/services/hours');
const { submitReview } = require('../src/services/reviewService');

const bathroomSeed = [{
  id: 'demo-union',
  name: 'Demo Bathroom',
  building: 'University Union',
  latitude: 35.3,
  longitude: -120.66,
  demo: true,
}];

async function withApi(callback, options) {
  const database = createDatabase(':memory:');
  seedBathrooms(database, bathroomSeed);
  const server = createApiApp(database, options).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}/api`, database);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    database.close();
  }
}

function requestJson(url, { method = 'GET', token, body } = {}) {
  return fetch(url, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test('bathroom directory exposes unknown attributes and does not infer open status', async () => {
  await withApi(async (apiUrl) => {
    const response = await requestJson(`${apiUrl}/bathrooms/demo-union`);
    const { bathroom } = await response.json();
    assert.equal(response.status, 200);
    assert.equal(bathroom.directoryVerified, false);
    assert.equal(bathroom.demo, true);
    assert.equal(bathroom.openStatus, 'unknown');
    assert.equal(bathroom.busynessStatus, 'unknown');
    assert.equal(bathroom.hours, null);
    assert.equal(bathroom.amenities, null);
    assert.equal(bathroom.accessibility, null);
    assert.deepEqual(bathroom.safetyInfo, []);
  });
});

test('directory edits require admin authorization and verification metadata', async () => {
  const patch = { verified: true, source: 'Facilities inspection' };
  await withApi(async (apiUrl) => {
    const response = await requestJson(`${apiUrl}/bathrooms/demo-union/directory`, {
      method: 'PATCH',
      body: patch,
    });
    assert.equal(response.status, 503);
  });

  await withApi(async (apiUrl, database) => {
    const path = `${apiUrl}/bathrooms/demo-union/directory`;
    const missingToken = await requestJson(path, { method: 'PATCH', body: patch });
    assert.equal(missingToken.status, 401);
    const wrongToken = await requestJson(path, {
      method: 'PATCH',
      body: patch,
      token: 'wrong-token',
    });
    assert.equal(wrongToken.status, 401);
  }, { adminToken: 'valid-admin-token', adminName: 'Facilities owner' });
});

test('authorized directory verification persists nullable coordinates and structured facts', async () => {
  await withApi(async (apiUrl, database) => {
    submitReview(database, {
      bathroomId: 'demo-union',
      installationId: 'installation-12345678',
      cleanliness: 4,
      busyness: 'Low',
    });
    const payload = {
      verified: true,
      source: 'Facilities office inspection',
      name: 'Union restroom',
      building: 'University Union',
      latitude: null,
      longitude: null,
      restroomType: 'single-stall',
      amenities: { babyChanging: true, menstrualProducts: null, hooks: false, shelves: null },
      accessibility: {
        wheelchairAccessible: true,
        grabBars: true,
        accessibleSink: null,
        stepFreeRoute: false,
      },
      timezone: 'America/Los_Angeles',
      hours: {
        sun: [],
        mon: null,
        tue: null,
        wed: null,
        thu: null,
        fri: null,
        sat: null,
      },
      safetyInfo: [{
        text: 'Campus security escort service information.',
        source: 'Campus Safety',
        kind: 'campus_source',
        updatedAt: '2026-10-31T12:00:00.000Z',
        verified: true,
      }],
    };
    const response = await requestJson(`${apiUrl}/bathrooms/demo-union/directory`, {
      method: 'PATCH',
      token: 'admin-secret',
      body: payload,
    });
    assert.equal(response.status, 200);

    const details = await requestJson(`${apiUrl}/bathrooms/demo-union`);
    const { bathroom } = await details.json();
    assert.equal(bathroom.directoryVerified, true);
    assert.equal(bathroom.demo, false);
    assert.equal(bathroom.directoryVerified, true);
    assert.equal(bathroom.verificationSource, 'Facilities office inspection');
    assert.equal(bathroom.verifiedBy, 'Directory team');
    assert.equal(bathroom.latitude, null);
    assert.equal(bathroom.restroomType, 'single-stall');
    assert.deepEqual(bathroom.amenities, {
      babyChanging: true,
      menstrualProducts: null,
      hooks: false,
      shelves: null,
    });
    assert.equal(bathroom.openStatus, 'unknown');
    assert.equal(bathroom.safetyInfo[0].verified, true);

    seedBathrooms(database, [{ ...bathroomSeed[0], name: 'Outdated seed name' }]);
    const afterSeed = await requestJson(`${apiUrl}/bathrooms/demo-union`);
    const updatedBathroom = (await afterSeed.json()).bathroom;
    assert.equal(updatedBathroom.name, 'Union restroom');
    assert.equal(updatedBathroom.reviewCount, 1);
  }, { adminToken: 'admin-secret', adminName: 'Directory team' });
});

test('directory validation rejects unapproved values and records can be unverified', async () => {
  await withApi(async (apiUrl) => {
    const path = `${apiUrl}/bathrooms/demo-union/directory`;
    const invalid = await requestJson(path, {
      method: 'PATCH',
      token: 'admin-secret',
      body: {
        verified: true,
        source: 'Facility check',
        restroomType: 'family-suite',
      },
    });
    assert.equal(invalid.status, 400);

    const unauthenticated = await requestJson(path, {
      method: 'PATCH',
      body: { verified: true, source: 'Facility check' },
    });
    assert.equal(unauthenticated.status, 401);

    const verified = await requestJson(path, {
      method: 'PATCH',
      token: 'admin-secret',
      body: { verified: true, source: 'Facility check' },
    });
    assert.equal(verified.status, 200);
    const unverify = await requestJson(path, {
      method: 'PATCH',
      token: 'admin-secret',
      body: { verified: false, source: 'Verification expired' },
    });
    assert.equal(unverify.status, 200);
    const details = await requestJson(`${apiUrl}/bathrooms/demo-union`);
    assert.equal((await details.json()).bathroom.demo, true);
  }, { adminToken: 'admin-secret', adminName: 'Directory team' });
});

test('maintenance reports validate, persist, list, and require admin status updates', async () => {
  await withApi(async (apiUrl) => {
    const path = `${apiUrl}/bathrooms/demo-union/maintenance-reports`;
    const invalid = await requestJson(path, {
      method: 'POST',
      body: {
        installationId: 'installation-12345678',
        category: 'mystery',
        description: 'Broken',
      },
    });
    assert.equal(invalid.status, 400);
    assert.match((await invalid.json()).error, /Category/);

    const submitted = await requestJson(path, {
      method: 'POST',
      body: {
        installationId: 'installation-12345678',
        category: 'fixture',
        description: 'Sink faucet is leaking.',
      },
    });
    assert.equal(submitted.status, 201);
    const { report } = await submitted.json();
    assert.equal(report.status, 'open');
    assert.equal(report.bathroomId, 'demo-union');

    const listResponse = await requestJson(path);
    assert.equal((await listResponse.json()).reports.length, 1);
    const unauthenticated = await requestJson(`${apiUrl}/bathrooms/maintenance-reports/${report.id}`, {
      method: 'PATCH',
      body: { status: 'resolved' },
    });
    assert.equal(unauthenticated.status, 503);
  });

  await withApi(async (apiUrl) => {
    const submitted = await requestJson(`${apiUrl}/bathrooms/demo-union/maintenance-reports`, {
      method: 'POST',
      body: {
        installationId: 'installation-12345678',
        category: 'supplies',
        description: 'Soap dispenser is empty.',
      },
    });
    const { report } = await submitted.json();
    const update = await requestJson(`${apiUrl}/bathrooms/maintenance-reports/${report.id}`, {
      method: 'PATCH',
      token: 'maintenance-admin',
      body: { status: 'in_progress' },
    });
    assert.equal(update.status, 200);
    assert.equal((await update.json()).report.status, 'in_progress');
  }, { adminToken: 'maintenance-admin', adminName: 'Maintenance coordinator' });
});

test('open-hours calculation supports local time, overnight intervals, closed and unknown states', () => {
  const allUnknown = {
    sun: null, mon: null, tue: null, wed: null, thu: null, fri: null, sat: null,
  };
  assert.equal(getOpenStatus(null, 'America/Los_Angeles'), 'unknown');
  assert.equal(getOpenStatus(allUnknown, 'Not/A_Timezone'), 'unknown');
  assert.equal(getOpenStatus(allUnknown, 'America/Los_Angeles'), 'unknown');

  const overnight = {
    ...allUnknown,
    sat: [{ open: '22:00', close: '02:00' }],
    sun: [],
  };
  assert.equal(
    getOpenStatus(overnight, 'America/Los_Angeles', new Date('2026-03-08T08:30:00.000Z')),
    'open',
  );
  assert.equal(
    getOpenStatus(overnight, 'America/Los_Angeles', new Date('2026-03-08T11:00:00.000Z')),
    'closed',
  );

  const mondayHours = {
    ...allUnknown,
    sun: [],
    mon: [{ open: '09:00', close: '17:00' }],
  };
  assert.equal(
    getOpenStatus(mondayHours, 'America/Los_Angeles', new Date('2026-11-02T18:00:00.000Z')),
    'open',
  );
  assert.throws(() => validateHours({ mon: [] }, 'America/Los_Angeles'), /include a value/);
  assert.throws(() => validateHours(allUnknown, 'Not/A_Timezone'), /valid timezone/);
});

test('busyness switches to stale after 24 hours and future timestamps remain unknown', () => {
  const now = new Date('2026-11-01T20:00:00.000Z');
  assert.equal(getBusynessStatus('Low', '2026-10-31T20:00:00.000Z', now), 'current');
  assert.equal(getBusynessStatus('Low', '2026-10-31T19:59:59.999Z', now), 'stale');
  assert.equal(getBusynessStatus('High', '2026-11-01T20:00:01.000Z', now), 'unknown');
});

test('migration allows unknown coordinates while preserving bathroom-linked reviews', () => {
  const database = new DatabaseSync(':memory:');
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE bathrooms (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, building TEXT NOT NULL,
      latitude REAL NOT NULL, longitude REAL NOT NULL, demo INTEGER NOT NULL DEFAULT 1,
      busyness TEXT, busyness_reported_at TEXT
    );
    CREATE TABLE reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bathroom_id TEXT NOT NULL REFERENCES bathrooms(id),
      installation_id TEXT NOT NULL, review_day TEXT NOT NULL,
      cleanliness INTEGER NOT NULL, busyness TEXT NOT NULL, created_at TEXT NOT NULL
    );
    INSERT INTO bathrooms VALUES ('legacy', 'Legacy Bathroom', 'Legacy Building', 35.3, -120.6, 1, NULL, NULL);
    INSERT INTO reviews (bathroom_id, installation_id, review_day, cleanliness, busyness, created_at)
      VALUES ('legacy', 'installation-12345678', '2026-11-01', 4, 'Low', '2026-11-01T00:00:00.000Z');
  `);
  try {
    migrateBathroomDirectory(database);
    database.exec(`
      INSERT INTO bathrooms (id, name, building, latitude, longitude)
      VALUES ('unknown-location', 'Unknown location', 'Unknown', NULL, NULL)
    `);
    assert.equal(database.prepare('SELECT COUNT(*) AS count FROM reviews').get().count, 1);
    assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal(database.prepare('SELECT latitude FROM bathrooms WHERE id = ?').get('unknown-location').latitude, null);
  } finally {
    database.close();
  }
});
