const bcrypt = require('bcryptjs');
const express = require('express');
const { signAccessToken } = require('../auth/token');

const INVALID_CREDENTIALS = { error: 'Invalid username or password.' };

// A real bcrypt hash of a random string. Comparing against it when the
// username doesn't exist keeps the response time similar either way, so
// timing can't reveal which usernames are registered.
const DUMMY_HASH = '$2a$10$8TSa75dpr2Gq/cKYgPmkROGGZypVb3eeBzrer6npJgdGcrvHYTPBe';

function createAuthRouter(database, { tokenSecret }) {
  const router = express.Router();

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

module.exports = { createAuthRouter };
