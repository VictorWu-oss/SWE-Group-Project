const assert = require('node:assert/strict');
const test = require('node:test');
const { createApiApp } = require('../src/app');
const { createDatabase, seedBathrooms } = require('../src/db/database');

async function withApi(callback) {
  const database = createDatabase(':memory:');
  seedBathrooms(database, [{
    id: 'system-bathroom',
    name: 'System Bathroom',
    building: 'Test Building',
    latitude: 35.3,
    longitude: -120.66,
    demo: true,
  }]);

  const server = createApiApp(database).listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const apiUrl = `http://127.0.0.1:${server.address().port}/api`;

  try {
    await callback(apiUrl, database);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    database.close();
  }
}

async function postReport(apiUrl, description) {
  return fetch(`${apiUrl}/bathrooms/system-bathroom/maintenance-reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      installationId: 'system-test-installation',
      category: 'supplies',
      description,
    }),
  });
}

test('maintenance report submission persists and returns the report in the list', async () => {
  await withApi(async (apiUrl) => {
    const submittedResponse = await postReport(apiUrl, '  Out of paper towels.  ');
    assert.equal(submittedResponse.status, 201);

    const { report } = await submittedResponse.json();
    assert.deepEqual(report, {
      id: 1,
      bathroomId: 'system-bathroom',
      category: 'supplies',
      description: 'Out of paper towels.',
      status: 'open',
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    });
    assert.ok(Number.isFinite(Date.parse(report.createdAt)));
    assert.equal(report.updatedAt, report.createdAt);

    const listResponse = await fetch(`${apiUrl}/bathrooms/system-bathroom/maintenance-reports`);
    assert.equal(listResponse.status, 200);
    assert.deepEqual(await listResponse.json(), { reports: [report] });
  });
});

test('invalid maintenance report descriptions return validation errors without persistence', async () => {
  await withApi(async (apiUrl, database) => {
    const tooShortResponse = await postReport(apiUrl, ' bad ');
    assert.equal(tooShortResponse.status, 400);
    assert.deepEqual(await tooShortResponse.json(), {
      error: 'Description must contain between 5 and 500 characters.',
    });

    const tooLongResponse = await postReport(apiUrl, 'x'.repeat(501));
    assert.equal(tooLongResponse.status, 400);
    assert.deepEqual(await tooLongResponse.json(), {
      error: 'Description must contain between 5 and 500 characters.',
    });

    const listResponse = await fetch(`${apiUrl}/bathrooms/system-bathroom/maintenance-reports`);
    assert.equal(listResponse.status, 200);
    assert.deepEqual(await listResponse.json(), { reports: [] });
    assert.equal(
      database.prepare('SELECT COUNT(*) AS count FROM maintenance_reports').get().count,
      0,
    );
  });
});
