const assert = require('node:assert/strict');
const test = require('node:test');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createApiApp } = require('../src/app');
const { createDatabase, seedBathrooms } = require('../src/db/database');

const TOKEN_SECRET = 'test-jwt-secret';

async function withApi(callback) {
  const database = createDatabase(':memory:');
  seedBathrooms(database, [{
    id: 'union-west',
    name: 'West Bathroom',
    building: 'University Union',
    latitude: 35.3,
    longitude: -120.66,
    demo: true,
  }]);
  database.prepare(
    'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)',
  ).run('lia', bcrypt.hashSync('correct-password', 10), new Date().toISOString());

  const server = createApiApp(database, { tokenSecret: TOKEN_SECRET }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await callback(`http://127.0.0.1:${server.address().port}/api`, database);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    database.close();
  }
}

function login(apiUrl, body) {
  return fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function signup(apiUrl, body) {
  return fetch(`${apiUrl}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function postReview(apiUrl, authorization) {
  const headers = { 'Content-Type': 'application/json' };
  if (authorization !== undefined) headers.Authorization = authorization;
  return fetch(`${apiUrl}/bathrooms/union-west/reviews`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      installationId: 'installation-12345678',
      cleanliness: 4,
      busyness: 'Low',
    }),
  });
}

test('sign-in with valid credentials returns 200 and a token', async () => {
  await withApi(async (apiUrl) => {
    const response = await login(apiUrl, { username: 'lia', password: 'correct-password' });
    assert.equal(response.status, 200);
    const { token } = await response.json();
    assert.equal(jwt.verify(token, TOKEN_SECRET).username, 'lia');
  });
});

test('sign-up creates a bcrypt password hash and returns a JWT', async () => {
  await withApi(async (apiUrl, database) => {
    const password = 'secure-password';
    const response = await signup(apiUrl, { username: 'new.user', password });

    assert.equal(response.status, 201);
    const { token } = await response.json();
    assert.equal(jwt.verify(token, TOKEN_SECRET).username, 'new.user');

    const storedUser = database.prepare(
      'SELECT username, password_hash FROM users WHERE username = ?',
    ).get('new.user');
    assert.deepEqual(Object.keys(storedUser).sort(), ['password_hash', 'username']);
    assert.notEqual(storedUser.password_hash, password);
    assert.match(storedUser.password_hash, /^\$2[aby]\$/);
    assert.equal(await bcrypt.compare(password, storedUser.password_hash), true);
  });
});

test('sign-up returns 400 with clear validation errors for invalid credentials', async () => {
  await withApi(async (apiUrl) => {
    const cases = [
      { body: {}, error: 'Username must be 3 to 32 letters, numbers, dots, underscores, or hyphens.' },
      { body: { username: 'bad name', password: 'secure-password' }, error: 'Username must be 3 to 32 letters, numbers, dots, underscores, or hyphens.' },
      { body: { username: 'valid-user', password: 'short' }, error: 'Password must contain between 8 and 128 characters.' },
    ];
    for (const { body, error } of cases) {
      const response = await signup(apiUrl, body);
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error });
    }
  });
});

test('sign-up rejects a duplicate username without adding another user', async () => {
  await withApi(async (apiUrl, database) => {
    assert.equal((await signup(apiUrl, {
      username: 'duplicate-user', password: 'secure-password',
    })).status, 201);

    const duplicate = await signup(apiUrl, {
      username: 'duplicate-user', password: 'another-password',
    });
    assert.equal(duplicate.status, 409);
    assert.deepEqual(await duplicate.json(), { error: 'That username is already registered.' });
    assert.equal(database.prepare('SELECT COUNT(*) AS count FROM users WHERE username = ?')
      .get('duplicate-user').count, 1);
  });
});

test('sign-in failures return the same 401 for wrong password and unknown user', async () => {
  await withApi(async (apiUrl) => {
    const wrongPassword = await login(apiUrl, { username: 'lia', password: 'nope' });
    const unknownUser = await login(apiUrl, { username: 'nobody', password: 'nope' });
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownUser.status, 401);
    const expected = { error: 'Invalid username or password.' };
    assert.deepEqual(await wrongPassword.json(), expected);
    assert.deepEqual(await unknownUser.json(), expected);
  });
});

test('sign-in without a username or password returns 400', async () => {
  await withApi(async (apiUrl) => {
    const response = await login(apiUrl, { username: 'lia' });
    assert.equal(response.status, 400);
  });
});

test('protected review route succeeds with a valid token', async () => {
  await withApi(async (apiUrl) => {
    const { token } = await (await login(apiUrl, {
      username: 'lia',
      password: 'correct-password',
    })).json();
    const response = await postReview(apiUrl, `Bearer ${token}`);
    assert.equal(response.status, 201);
    assert.equal((await response.json()).bathroom.reviewCount, 1);
  });
});

test('protected review route returns 401 for missing, malformed, invalid, and expired tokens', async () => {
  await withApi(async (apiUrl) => {
    const valid = jwt.sign({ username: 'lia' }, TOKEN_SECRET);
    const forged = jwt.sign({ username: 'lia' }, 'wrong-secret');
    const expired = jwt.sign(
      { username: 'lia', exp: Math.floor(Date.now() / 1000) - 60 },
      TOKEN_SECRET,
    );
    const cases = [
      { authorization: undefined, error: /Sign in/ },
      { authorization: valid, error: /Bearer <token>/ },
      { authorization: 'Bearer', error: /Bearer <token>/ },
      { authorization: 'Bearer not-a-jwt', error: /invalid/ },
      { authorization: `Bearer ${forged}`, error: /invalid/ },
      { authorization: `Bearer ${expired}`, error: /expired/ },
    ];
    for (const { authorization, error } of cases) {
      const response = await postReview(apiUrl, authorization);
      assert.equal(response.status, 401, `expected 401 for ${authorization}`);
      assert.match((await response.json()).error, error);
    }
  });
});

test('sign-in and read routes stay public', async () => {
  await withApi(async (apiUrl) => {
    assert.equal((await fetch(`${apiUrl}/bathrooms`)).status, 200);
    assert.notEqual((await login(apiUrl, { username: 'x', password: 'y' })).status, 403);
  });
});
