const assert = require('node:assert/strict');
const test = require('node:test');
const { createApiApp } = require('../src/app');
const { createDatabase, seedBathrooms } = require('../src/db/database');

test('parallel review requests accept one and reject the duplicate', async () => {
  const database = createDatabase(':memory:');
  seedBathrooms(database, [{
    id: 'demo-bathroom',
    name: 'Demo Bathroom',
    building: 'Demo Building',
    latitude: 35.3,
    longitude: -120.66,
    demo: true,
  }]);
  const server = createApiApp(database).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}/api/bathrooms/demo-bathroom/reviews`;
  const payload = {
    installationId: 'installation-12345678',
    cleanliness: 4,
    busyness: 'Medium',
  };

  try {
    const responses = await Promise.all([
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
    ]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
    const bathroomsResponse = await fetch(`http://127.0.0.1:${address.port}/api/bathrooms?installationId=installation-12345678`);
    const { bathrooms } = await bathroomsResponse.json();
    assert.equal(bathrooms[0].reviewCount, 1);
    assert.equal(bathrooms[0].reviewedToday, true);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    database.close();
  }
});