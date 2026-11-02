import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError, apiHttpError, apiInvalidResponseError, apiTimeoutError, apiUnreachableError } from '../src/main/apiErrors.ts';

test('API diagnostics identify an unreachable backend and include its URL', () => {
  const error = apiUnreachableError('http://192.168.1.212:3000/api', 'http://192.168.1.212:3000/api/bathrooms', ' network unavailable');
  assert.ok(error instanceof ApiError);
  assert.equal(error.code, 'API_UNREACHABLE');
  assert.equal(error.status, 0);
  assert.match(error.message, /192\.168\.1\.212.*network unavailable/);
});

test('API diagnostics identify HTTP failures and preserve the server error', () => {
  const error = apiHttpError('Database unavailable.', 503, 'http://localhost:3000/api/health');
  assert.equal(error.code, 'API_HTTP_ERROR');
  assert.equal(error.status, 503);
  assert.equal(error.message, 'Database unavailable.');
});

test('API diagnostics identify timeout and malformed responses', () => {
  assert.equal(apiTimeoutError('http://localhost:3000/api', 'http://localhost:3000/api/bathrooms').code, 'API_TIMEOUT');
  assert.equal(apiInvalidResponseError('Bad JSON').code, 'API_INVALID_RESPONSE');
});
