const assert = require('node:assert/strict');
const test = require('node:test');
const {
  getBusynessStatus,
  getOpenStatus,
  isValidTimezone,
  validateHours,
} = require('../src/services/hours');

const COMPLETE_HOURS = {
  sun: null,
  mon: [{ open: '22:00', close: '02:00' }],
  tue: [],
  wed: null,
  thu: null,
  fri: null,
  sat: null,
};

test('accepts a valid IANA timezone and rejects invalid timezone values', () => {
  assert.equal(isValidTimezone('America/Los_Angeles'), true);
  assert.equal(isValidTimezone('Not/A_Timezone'), false);
  assert.equal(isValidTimezone(''), false);
  assert.equal(isValidTimezone(null), false);
});

test('accepts a complete weekly schedule with an overnight interval', () => {
  assert.doesNotThrow(() => validateHours(COMPLETE_HOURS, 'America/Los_Angeles'));
});

test('rejects an incomplete weekly schedule', () => {
  const missingThursday = { ...COMPLETE_HOURS };
  delete missingThursday.thu;

  assert.throws(
    () => validateHours(missingThursday, 'America/Los_Angeles'),
    (error) => error.statusCode === 400
      && error.message === 'Hours must include a value for thu.',
  );
});

test('rejects malformed or equal opening and closing times', () => {
  const malformed = {
    ...COMPLETE_HOURS,
    mon: [{ open: '25:00', close: '25:30' }],
  };

  assert.throws(
    () => validateHours(malformed, 'America/Los_Angeles'),
    (error) => error.statusCode === 400
      && error.message === 'Hours for mon contain an invalid time interval.',
  );

  assert.throws(
    () => validateHours({ ...COMPLETE_HOURS, tue: [{ open: '10:00', close: '10:00' }] }, 'America/Los_Angeles'),
    (error) => error.statusCode === 400,
  );
});

test('classifies busyness as current, stale, unknown, or future-denied', () => {
  const now = new Date('2026-06-15T19:00:00.000Z');

  assert.equal(getBusynessStatus('Low', '2026-06-14T19:00:00.000Z', now), 'current');
  assert.equal(getBusynessStatus('Medium', '2026-06-14T18:59:59.000Z', now), 'stale');
  assert.equal(getBusynessStatus('High', '2026-06-16T19:00:00.000Z', now), 'unknown');
  assert.equal(getBusynessStatus(null, '2026-06-15T18:00:00.000Z', now), 'unknown');
  assert.equal(getBusynessStatus('Low', 'not-a-date', now), 'unknown');
});

test('reports an overnight schedule as open after midnight', () => {
  const hours = {
    sun: [],
    mon: [{ open: '22:00', close: '02:00' }],
    tue: [],
    wed: null,
    thu: null,
    fri: null,
    sat: null,
  };

  assert.equal(
    getOpenStatus(hours, 'America/Los_Angeles', new Date('2026-06-16T07:30:00.000Z')),
    'open',
  );
});
