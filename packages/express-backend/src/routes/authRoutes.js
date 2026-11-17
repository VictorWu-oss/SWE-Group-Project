const bcrypt = require('bcryptjs');
const express = require('express');
const { signAccessToken } = require('../auth/token');

const INVALID_CREDENTIALS = { error: 'Invalid username or password.' };
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,32}$/;
const PASSWORD_MINIMUM_LENGTH = 8;
const PASSWORD_MAXIMUM_LENGTH = 128;
const PASSWORD_HASH_ROUNDS = 12;

// A real bcrypt hash of a random string. Comparing against it when the
// username doesn't exist keeps the response time similar either way, so
// timing can't reveal which usernames are registered.
const DUMMY_HASH = '$2a$10$8TSa75dpr2Gq/cKYgPmkROGGZypVb3eeBzrer6npJgdGcrvHYTPBe';

function createAuthRouter(database, { tokenSecret }) {
  const router = express.Router();

  // POST /api/auth/signup  body: { username, password }
  router.post('/signup', async (request, response, next) => {
    if (!tokenSecret) {
      return response.status(503).json({ error: 'Sign-in is not configured.' });
    }

    const credentials = validateCredentials(request.body);
    if (credentials.error) return response.status(400).json(credentials.error);

    const { username, password } = credentials;
    if (database.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) {
      return response.status(409).json({ error: 'That username is already registered.' });
    }

    try {
      const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
      database.prepare(
        'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)',
      ).run(username, passwordHash, new Date().toISOString());
    } catch (error) {
      if (error.code === 'ERR_SQLITE_CONSTRAINT' && /UNIQUE constraint failed/.test(error.message)) {
        return response.status(409).json({ error: 'That username is already registered.' });
      }
      return next(error);
    }

    return response.status(201).json({ token: signAccessToken(username, tokenSecret) });
  });

  // POST /api/auth/login  body: { username, password }
  router.post('/login', async (request, response) => {
    if (!tokenSecret) {
      return response.status(503).json({ error: 'Sign-in is not configured.' });
    }

    const { username, password } = request.body || {};
    if (typeof username !== 'string' || typeof password !== 'string'
      || !username.trim() || !password) {
      return response.status(400).json({ error: 'Username and password are required.' });
    }

    const user = database.prepare(
      'SELECT username, password_hash FROM users WHERE username = ?',
    ).get(username.trim());

    // Same 401 whether the username or the password is wrong.
    const matched = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !matched) {
      return response.status(401).json(INVALID_CREDENTIALS);
    }

    return response.json({ token: signAccessToken(user.username, tokenSecret) });
  });

  return router;
}

function validateCredentials(input) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { error: { error: 'Username and password are required.' } };
  }
  const { username, password } = input;
  if (typeof username !== 'string' || !USERNAME_PATTERN.test(username.trim())) {
    return { error: { error: 'Username must be 3 to 32 letters, numbers, dots, underscores, or hyphens.' } };
  }
  if (typeof password !== 'string'
    || password.length < PASSWORD_MINIMUM_LENGTH
    || password.length > PASSWORD_MAXIMUM_LENGTH) {
    return { error: { error: 'Password must contain between 8 and 128 characters.' } };
  }
  return { username: username.trim(), password };
}

module.exports = { createAuthRouter };
