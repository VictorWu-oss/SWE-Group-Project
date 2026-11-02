const assert = require('node:assert/strict');
const test = require('node:test');
const { createApiApp } = require('../src/app');
const { decodePolyline } = require('../src/routes/routingRoutes');

test('decodes Valhalla polyline-6 geometry', () => {
  assert.deepEqual(decodePolyline('??AA'), [
    { latitude: 0, longitude: 0 },
    { latitude: 0.000001, longitude: 0.000001 },
  ]);
});

test('walking route endpoint returns pedestrian geometry and instructions', async () => {
  const app = createApiApp({}, {
    routingFetch: async () => ({
      ok: true,
      json: async () => ({
        trip: {
          summary: { length: 0.12, time: 96.7 },
          legs: [{ shape: '??AA', maneuvers: [{ instruction: 'Walk north on Campus Way.' }] }],
        },
      }),
    }),
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  try {
    const response = await fetch('http://127.0.0.1:' + port + '/api/routes/walking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { latitude: 35.3, longitude: -120.66 },
        destination: { latitude: 35.31, longitude: -120.67 },
      }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      route: {
        coordinates: [
          { latitude: 0, longitude: 0 },
          { latitude: 0.000001, longitude: 0.000001 },
        ],
        distanceMeters: 120,
        durationSeconds: 97,
        instructions: ['Walk north on Campus Way.'],
      },
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
