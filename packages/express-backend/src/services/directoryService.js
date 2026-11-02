const {
  getBusynessStatus,
  getOpenStatus,
  isValidTimezone,
  validateHours,
} = require('./hours');

const AMENITY_FIELDS = ['babyChanging', 'menstrualProducts', 'hooks', 'shelves'];
const ACCESSIBILITY_FIELDS = ['wheelchairAccessible', 'grabBars', 'accessibleSink', 'stepFreeRoute'];
const DIRECTORY_FIELDS = new Set([
  'verified',
  'source',
  'name',
  'building',
  'latitude',
  'longitude',
  'restroomType',
  'amenities',
  'accessibility',
  'hours',
  'timezone',
  'indoorDirections',
  'safetyInfo',
]);

function parseJson(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  return JSON.parse(value);
}

function mapDirectoryBathroom(row, now = new Date()) {
  return {
    id: row.id,
    name: row.name,
    building: row.building,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    demo: Boolean(row.demo),
    averageCleanliness: row.average_cleanliness == null
      ? null
      : Number(row.average_cleanliness.toFixed(1)),
    reviewCount: row.review_count,
    busyness: row.busyness,
    busynessReportedAt: row.busyness_reported_at,
    busynessStatus: getBusynessStatus(row.busyness, row.busyness_reported_at, now),
    reviewedToday: Boolean(row.reviewed_today),
    restroomType: row.restroom_type,
    amenities: parseJson(row.amenities_json),
    accessibility: parseJson(row.accessibility_json),
    hours: parseJson(row.hours_json),
    timezone: row.timezone,
    openStatus: row.directory_verified
      ? getOpenStatus(parseJson(row.hours_json), row.timezone, now)
      : 'unknown',
    indoorDirections: row.indoor_directions,
    safetyInfo: parseJson(row.safety_info_json, []),
    directoryVerified: Boolean(row.directory_verified),
    verificationSource: row.verification_source,
    verifiedAt: row.verified_at,
    verifiedBy: row.verified_by,
  };
}

function updateBathroomDirectory(database, bathroomId, input, now = new Date(), adminName = 'authorized administrator') {
  if (!isRecord(input)) throw validationError('A directory update body is required.');
  const unexpected = Object.keys(input).find((key) => !DIRECTORY_FIELDS.has(key));
  if (unexpected) throw validationError(`Unsupported directory field: ${unexpected}.`);
  if (typeof input.verified !== 'boolean') {
    throw validationError('The verified field must be a boolean.');
  }
  if (typeof input.source !== 'string' || input.source.trim().length < 3 || input.source.length > 300) {
    throw validationError('A verification source between 3 and 300 characters is required.');
  }

  const [existing] = database.prepare('SELECT * FROM bathrooms WHERE id = ?').all(bathroomId);
  if (!existing) throw Object.assign(new Error('Bathroom not found.'), { statusCode: 404 });

  const values = {};
  if ('name' in input) values.name = requiredText(input.name, 'name', 120);
  if ('building' in input) values.building = requiredText(input.building, 'building', 120);
  if ('latitude' in input) values.latitude = coordinate(input.latitude, -90, 90, 'latitude');
  if ('longitude' in input) values.longitude = coordinate(input.longitude, -180, 180, 'longitude');
  if ('restroomType' in input) {
    if (input.restroomType !== null && !['single-stall', 'multi-stall'].includes(input.restroomType)) {
      throw validationError('Restroom type must be single-stall, multi-stall, or null.');
    }
    values.restroom_type = input.restroomType;
  }
  if ('amenities' in input) {
    values.amenities_json = JSON.stringify(validateTriStateObject(input.amenities, AMENITY_FIELDS, 'amenities'));
  }
  if ('accessibility' in input) {
    values.accessibility_json = JSON.stringify(
      validateTriStateObject(input.accessibility, ACCESSIBILITY_FIELDS, 'accessibility'),
    );
  }
  const timezone = 'timezone' in input ? input.timezone : existing.timezone;
  if ('timezone' in input && timezone !== null && !isValidTimezone(timezone)) {
    throw validationError('Timezone must be a valid IANA timezone or null.');
  }
  if ('hours' in input) {
    validateHours(input.hours, timezone);
    values.hours_json = input.hours === null ? null : JSON.stringify(input.hours);
  }
  if ('timezone' in input) values.timezone = timezone;
  if ('indoorDirections' in input) {
    values.indoor_directions = input.indoorDirections === null
      ? null
      : requiredText(input.indoorDirections, 'indoorDirections', 500);
  }
  if ('safetyInfo' in input) {
    values.safety_info_json = input.safetyInfo === null
      ? null
      : JSON.stringify(validateSafetyInfo(input.safetyInfo));
  }

  const assignments = Object.keys(values).map((field) => `${field} = ?`);
  assignments.push('directory_verified = ?', 'demo = ?', 'verification_source = ?', 'verified_at = ?', 'verified_by = ?');
  const params = [
    ...Object.values(values),
    input.verified ? 1 : 0,
    input.verified ? 0 : 1,
    input.source.trim(),
    input.verified ? now.toISOString() : null,
    input.verified ? adminName : null,
    bathroomId,
  ];
  database.prepare(`UPDATE bathrooms SET ${assignments.join(', ')} WHERE id = ?`).run(...params);
  return database.prepare('SELECT * FROM bathrooms WHERE id = ?').get(bathroomId);
}

function validateTriStateObject(value, allowedFields, label) {
  if (value === null) return null;
  if (!isRecord(value)) throw validationError(`${label} must be an object.`);
  const unexpected = Object.keys(value).find((key) => !allowedFields.includes(key));
  if (unexpected) throw validationError(`Unsupported ${label} field: ${unexpected}.`);
  const result = {};
  for (const field of allowedFields) {
    const fieldValue = value[field] ?? null;
    if (fieldValue !== null && typeof fieldValue !== 'boolean') {
      throw validationError(`${label}.${field} must be true, false, or null.`);
    }
    result[field] = fieldValue;
  }
  return result;
}

function validateSafetyInfo(value) {
  if (!Array.isArray(value)) throw validationError('Safety information must be a list.');
  if (value.length > 50) throw validationError('Safety information cannot contain more than 50 entries.');
  return value.map((entry) => {
    if (
      !isRecord(entry)
      || typeof entry.text !== 'string'
      || entry.text.trim().length < 3
      || entry.text.length > 500
      || typeof entry.source !== 'string'
      || entry.source.trim().length < 3
      || !['campus_source', 'user_report'].includes(entry.kind)
      || typeof entry.updatedAt !== 'string'
      || !Number.isFinite(Date.parse(entry.updatedAt))
      || typeof entry.verified !== 'boolean'
    ) {
      throw validationError('Safety entries require text, source, kind, timestamp, and verified status.');
    }
    return {
      text: entry.text.trim(),
      source: entry.source.trim(),
      kind: entry.kind,
      updatedAt: new Date(entry.updatedAt).toISOString(),
      verified: entry.verified,
    };
  });
}

function requiredText(value, field, maximumLength) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maximumLength) {
    throw validationError(`${field} must contain 1 to ${maximumLength} characters.`);
  }
  return value.trim();
}

function coordinate(value, minimum, maximum, field) {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw validationError(`${field} must be a valid coordinate or null.`);
  }
  return value;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validationError(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

module.exports = {
  mapDirectoryBathroom,
  updateBathroomDirectory,
};
