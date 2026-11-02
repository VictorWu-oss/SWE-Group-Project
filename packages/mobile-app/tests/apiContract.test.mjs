// Contract test: runs the real Express API in-process and checks that every
// response the mobile client reads still passes the mobile parsers. If the
// backend changes a response shape, this test fails before the app does.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { parseBathroom } from '../src/main/types.ts';

const require = createRequire(import.meta.url);
const { createApiApp } = require('../../express-backend/src/app');
const { createDatabase, seedBathrooms } = require('../../express-backend/src/db/database');

const installationId = 'installation-contract-test';
const adminToken = 'contract-test-token';

async function withApi(callback) {
  const database = createDatabase(':memory:');
  seedBathrooms(database);
  const server = createApiApp(database, { adminToken, adminName: 'Contract test' })
    .listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const apiUrl = `http://127.0.0.1:${server.address().port}/api`;
  try {
    await callback(apiUrl);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    database.close();
  }
}

async function requestJson(url, { method = 'GET', body, token } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
}

// Mirrors the field checks in parseMaintenanceReport (src/main/api.ts).
function assertMaintenanceReportShape(report) {
  assert.equal(typeof report, 'object');
  assert.ok(Number.isInteger(report.id), 'report.id is an integer');
  assert.equal(typeof report.bathroomId, 'string');
  assert.ok(
    ['cleanliness', 'supplies', 'fixture', 'accessibility', 'safety', 'other'].includes(report.category),
    `unexpected category ${report.category}`,
  );
  assert.equal(typeof report.description, 'string');
  assert.ok(
    ['open', 'in_progress', 'resolved', 'dismissed'].includes(report.status),
    `unexpected status ${report.status}`,
  );
  assert.ok(!Number.isNaN(Date.parse(report.createdAt)), 'createdAt is a date');
  assert.ok(!Number.isNaN(Date.parse(report.updatedAt)), 'updatedAt is a date');
}

test('bathroom list and search responses parse with the mobile parser', async () => {
  await withApi(async (apiUrl) => {
    const list = await requestJson(`${apiUrl}/bathrooms?installationId=${installationId}`);
    assert.equal(list.status, 200);
    assert.ok(Array.isArray(list.body.bathrooms));
    assert.ok(list.body.bathrooms.length > 0, 'seed data should load at least one bathroom');
    list.body.bathrooms.forEach((bathroom) => parseBathroom(bathroom));

    const empty = await requestJson(
      `${apiUrl}/bathrooms?installationId=${installationId}&search=no-such-bathroom-xyz`,
    );
    assert.equal(empty.status, 200);
    assert.deepEqual(empty.body.bathrooms, []);
  });
});

test('details, review submission, and verified directory data parse with the mobile parser', async () => {
  await withApi(async (apiUrl) => {
    const list = await requestJson(`${apiUrl}/bathrooms?installationId=${installationId}`);
    const { id } = list.body.bathrooms[0];

    const details = await requestJson(`${apiUrl}/bathrooms/${id}?installationId=${installationId}`);
    assert.equal(details.status, 200);
    assert.equal(parseBathroom(details.body.bathroom).id, id);

    const review = await requestJson(`${apiUrl}/bathrooms/${id}/reviews`, {
      method: 'POST',
      body: { installationId, cleanliness: 5, busyness: 'Low' },
    });
    assert.equal(review.status, 201);
    const reviewed = parseBathroom(review.body.bathroom);
    assert.equal(reviewed.reviewCount, 1);
    assert.equal(reviewed.reviewedToday, true);
    assert.equal(reviewed.busyness, 'Low');

    const duplicate = await requestJson(`${apiUrl}/bathrooms/${id}/reviews`, {
      method: 'POST',
      body: { installationId, cleanliness: 4, busyness: 'High' },
    });
    assert.equal(duplicate.status, 409);
    assert.equal(typeof duplicate.body.error, 'string', 'errors use the { error } shape the client reads');

    const verified = await requestJson(`${apiUrl}/bathrooms/${id}/directory`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        verified: true,
        source: 'Contract test',
        restroomType: 'multi-stall',
        amenities: { babyChanging: true, menstrualProducts: null, hooks: false, shelves: null },
        accessibility: {
          wheelchairAccessible: true,
          grabBars: null,
          accessibleSink: false,
          stepFreeRoute: null,
        },
        timezone: 'America/Los_Angeles',
        hours: {
          sun: [],
          mon: [{ open: '07:00', close: '22:00' }],
          tue: null,
          wed: null,
          thu: null,
          fri: null,
          sat: null,
        },
      },
    });
    assert.equal(verified.status, 200);

    const verifiedDetails = await requestJson(`${apiUrl}/bathrooms/${id}?installationId=${installationId}`);
    const parsed = parseBathroom(verifiedDetails.body.bathroom);
    assert.equal(parsed.directoryVerified, true);
    assert.equal(parsed.restroomType, 'multi-stall');
  });
});

test('maintenance report responses match the shape the mobile client accepts', async () => {
  await withApi(async (apiUrl) => {
    const list = await requestJson(`${apiUrl}/bathrooms?installationId=${installationId}`);
    const { id } = list.body.bathrooms[0];

    const submitted = await requestJson(`${apiUrl}/bathrooms/${id}/maintenance-reports`, {
      method: 'POST',
      body: { installationId, category: 'supplies', description: 'Out of paper towels.' },
    });
    assert.equal(submitted.status, 201);
    assertMaintenanceReportShape(submitted.body.report);

    const reports = await requestJson(`${apiUrl}/bathrooms/${id}/maintenance-reports`);
    assert.equal(reports.status, 200);
    assert.ok(Array.isArray(reports.body.reports));
    assert.equal(reports.body.reports.length, 1);
    reports.body.reports.forEach(assertMaintenanceReportShape);
  });
});

test('unknown bathrooms return a 404 with the { error } shape the client reads', async () => {
  await withApi(async (apiUrl) => {
    const missing = await requestJson(`${apiUrl}/bathrooms/does-not-exist?installationId=${installationId}`);
    assert.equal(missing.status, 404);
    assert.equal(typeof missing.body.error, 'string');
  });
});
