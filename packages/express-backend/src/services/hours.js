const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function isValidTimezone(timezone) {
  if (typeof timezone !== 'string' || timezone.trim() === '') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function validateHours(hours, timezone) {
  if (hours === null) return;
  if (typeof hours !== 'object' || Array.isArray(hours)) {
    throw Object.assign(new Error('Hours must be a weekly schedule or null.'), { statusCode: 400 });
  }
  if (!isValidTimezone(timezone)) {
    throw Object.assign(new Error('A valid timezone is required when hours are provided.'), { statusCode: 400 });
  }
  const unexpectedDay = Object.keys(hours).find((day) => !DAYS.includes(day));
  if (unexpectedDay) {
    throw Object.assign(new Error(`Unknown weekday in hours: ${unexpectedDay}.`), { statusCode: 400 });
  }
  for (const day of DAYS) {
    if (!(day in hours)) {
      throw Object.assign(new Error(`Hours must include a value for ${day}.`), { statusCode: 400 });
    }
    const intervals = hours[day];
    if (intervals === null) continue;
    if (!Array.isArray(intervals)) {
      throw Object.assign(new Error(`Hours for ${day} must be an array, null, or an empty array.`), { statusCode: 400 });
    }
    for (const interval of intervals) {
      if (
        typeof interval !== 'object'
        || interval === null
        || Array.isArray(interval)
        || !isTime(interval.open)
        || !isTime(interval.close)
        || interval.open === interval.close
      ) {
        throw Object.assign(new Error(`Hours for ${day} contain an invalid time interval.`), { statusCode: 400 });
      }
    }
  }
}

function isTime(value) {
  return typeof value === 'string'
    && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function timeToMinutes(value) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function getOpenStatus(hours, timezone, date = new Date()) {
  if (!hours || !isValidTimezone(timezone)) return 'unknown';

  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  const dayIndex = DAYS.indexOf(parts.weekday.toLowerCase().slice(0, 3));
  if (dayIndex < 0) return 'unknown';
  const day = DAYS[dayIndex];
  const minute = Number(parts.hour) * 60 + Number(parts.minute);
  const today = hours[day];
  const yesterday = hours[DAYS[(dayIndex + DAYS.length - 1) % DAYS.length]];

  if (Array.isArray(today)) {
    for (const interval of today) {
      const opens = timeToMinutes(interval.open);
      const closes = timeToMinutes(interval.close);
      if (closes > opens && minute >= opens && minute < closes) return 'open';
      if (closes < opens && minute >= opens) return 'open';
    }
  }

  if (Array.isArray(yesterday)) {
    for (const interval of yesterday) {
      const opens = timeToMinutes(interval.open);
      const closes = timeToMinutes(interval.close);
      if (closes < opens && minute < closes) return 'open';
    }
  }

  return today === null || yesterday === null ? 'unknown' : 'closed';
}

function getBusynessStatus(busyness, reportedAt, now = new Date()) {
  if (!busyness || !reportedAt) return 'unknown';
  const timestamp = Date.parse(reportedAt);
  if (!Number.isFinite(timestamp) || timestamp > now.getTime()) return 'unknown';
  return now.getTime() - timestamp <= 24 * 60 * 60 * 1000 ? 'current' : 'stale';
}

module.exports = {
  getBusynessStatus,
  getOpenStatus,
  isValidTimezone,
  validateHours,
};
