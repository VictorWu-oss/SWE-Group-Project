const assert = require('node:assert/strict');
const test = require('node:test');
const { createApiApp } = require('../src/app');
const jwt = require('jsonwebtoken');
const { createDatabase, seedBathrooms } = require('../src/db/database');

const TOKEN_SECRET = 'test-jwt-secret';
const AUTH_HEADER = `Bearer ${jwt.sign({ username: 'tester' }, TOKEN_SECRET)}`;

async function withApi(callback) {
  const database = createDatabase(':memory:');
  seedBathrooms(database, [
    {
      id: 'union-west',
      name: 'West Bathroom',
      building: 'University Union',
      latitude: 35.3,
      longitude: -120.66,
      demo: true,
    },
    {
      id: 'library-east',
      name: 'East Bathroom',
      building: 'Library',
      latitude: 35.31,
      longitude: -120.67,
      demo: true,
    },
  ]);
  const server = createApiApp(database, { tokenSecret: TOKEN_SECRET }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();

  try {
    await callback(`http://127.0.0.1:${address.port}/api`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    database.close();
  }
}

test('bathroom list supports normal, case-insensitive search, and empty results', async () => {
  await withApi(async (apiUrl) => {
    const listResponse = await fetch(`${apiUrl}/bathrooms`);
    const listBody = await listResponse.json();
    assert.equal(listResponse.status, 200);
    assert.deepEqual(listBody.bathrooms.map(({ id }) => id), ['library-east', 'union-west']);

    const searchResponse = await fetch(`${apiUrl}/bathrooms?search=UNIVERSITY`);
    const searchBody = await searchResponse.json();
    assert.deepEqual(searchBody.bathrooms.map(({ id }) => id), ['union-west']);

    const emptyResponse = await fetch(`${apiUrl}/bathrooms?search=not-found`);
    const emptyBody = await emptyResponse.json();
    assert.equal(emptyResponse.status, 200);
    assert.deepEqual(emptyBody, { bathrooms: [] });
  });
});

test('bathroom details return the requested record and unknown IDs return 404', async () => {
  await withApi(async (apiUrl) => {
    const detailsResponse = await fetch(`${apiUrl}/bathrooms/union-west`);
    const { bathroom } = await detailsResponse.json();
    assert.equal(detailsResponse.status, 200);
    assert.equal(bathroom.id, 'union-west');
    assert.equal(bathroom.averageCleanliness, null);
    assert.equal(bathroom.busyness, null);

    const missingResponse = await fetch(`${apiUrl}/bathrooms/missing`);
    assert.equal(missingResponse.status, 404);
    assert.deepEqual(await missingResponse.json(), { error: 'Bathroom not found.' });
  });
});

test('review endpoint reports malformed, unknown-bathroom, and invalid-value errors', async () => {
  await withApi(async (apiUrl) => {
    const invalidJson = await fetch(`${apiUrl}/bathrooms/union-west/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: AUTH_HEADER },
      body: '{',
    });
    assert.equal(invalidJson.status, 400);
    assert.deepEqual(await invalidJson.json(), { error: 'Request body must be valid JSON.' });

    const invalidReview = await fetch(`${apiUrl}/bathrooms/union-west/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: AUTH_HEADER },
      body: JSON.stringify({
        installationId: 'installation-12345678',
        cleanliness: 6,
        busyness: 'Medium',
      }),
    });
    assert.equal(invalidReview.status, 400);
    assert.match((await invalidReview.json()).error, /Cleanliness/);

    const unknownBathroom = await fetch(`${apiUrl}/bathrooms/missing/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: AUTH_HEADER },
      body: JSON.stringify({
        installationId: 'installation-12345678',
        cleanliness: 4,
        busyness: 'Medium',
      }),
    });
    assert.equal(unknownBathroom.status, 404);
    assert.deepEqual(await unknownBathroom.json(), { error: 'Bathroom not found.' });
  });
});
