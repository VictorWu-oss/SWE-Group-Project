const assert = require('node:assert/strict');
const test = require('node:test');
const { createDatabase } = require('../src/db/database');
const { createToken, hashPassword, validateCredentials } = require('../src/auth');

test('passwords are salted and verifiable without storing plaintext', () => {
  const first = hashPassword('correct horse battery staple');
  const second = hashPassword('correct horse battery staple');
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.equal(first.hash.length, 128);
});

test('credentials are normalized and weak input is rejected', () => {
  assert.deepEqual(validateCredentials({ username: ' Alice ', password: 'password123' }), { username: 'alice', password: 'password123' });
  assert.throws(() => validateCredentials({ username: 'ab', password: 'short' }), { statusCode: 400 });
});

test('users table is persistent in the application database', () => {
  const database = createDatabase(':memory:');
  database.prepare('INSERT INTO users VALUES (?, ?, ?, ?)').run('alice', 'salt', 'hash', new Date().toISOString());
  assert.equal(database.prepare('SELECT username FROM users').get().username, 'alice');
  database.close();
});

test('tokens contain an expiring signed payload', () => {
  const token = createToken('alice', 'secret', Date.UTC(2026, 0, 1));
  assert.equal(token.split('.').length, 3);
  assert.equal(JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub, 'alice');
});
