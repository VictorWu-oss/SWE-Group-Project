const losAngelesDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const { mapDirectoryBathroom } = require('./directoryService');
const busynessLevels = ['Low', 'Medium', 'High'];

function getLosAngelesDay(date = new Date()) {
  const parts = Object.fromEntries(
    losAngelesDate.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

class ReviewConflictError extends Error {
  constructor() {
    super("You've already submitted today's review for this bathroom.");
    this.name = 'ReviewConflictError';
    this.statusCode = 409;
  }
}

class BathroomNotFoundError extends Error {
  constructor() {
    super('Bathroom not found.');
    this.name = 'BathroomNotFoundError';
    this.statusCode = 404;
  }
}

function getBathroomSummaries(database, installationId, date = new Date(), search = '') {
  return getBathroomRows(database, installationId, date, { search })
    .map((row) => mapDirectoryBathroom(row, date));
}

function getBathroomSummary(database, bathroomId, installationId, date = new Date()) {
  const [row] = getBathroomRows(database, installationId, date, { bathroomId });
  return row ? mapDirectoryBathroom(row, date) : null;
}

function getBathroomRows(database, installationId, date, { bathroomId, search } = {}) {
  const filters = [];
  const parameters = [installationId, getLosAngelesDay(date)];
  if (typeof bathroomId === 'string') {
    filters.push('b.id = ?');
    parameters.push(bathroomId);
  }
  const normalizedSearch = typeof search === 'string' ? search.trim() : '';
  if (normalizedSearch) {
    filters.push('(instr(lower(b.name), lower(?)) > 0 OR instr(lower(b.building), lower(?)) > 0)');
    parameters.push(normalizedSearch, normalizedSearch);
  }
  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  return database.prepare(`
    SELECT b.*,
      COUNT(r.id) AS review_count,
      AVG(r.cleanliness) AS average_cleanliness,
      EXISTS (
        SELECT 1 FROM reviews today
        WHERE today.bathroom_id = b.id
          AND today.installation_id = ?
          AND today.review_day = ?
      ) AS reviewed_today
    FROM bathrooms b
    LEFT JOIN reviews r ON r.bathroom_id = b.id
    ${whereClause}
    GROUP BY b.id
    ORDER BY b.name COLLATE NOCASE
  `).all(...parameters);
}

function submitReview(database, input, now = new Date()) {
  const { bathroomId, installationId, cleanliness, busyness } = validateReviewInput(input);
  const day = getLosAngelesDay(now);
  const timestamp = now.toISOString();
  database.exec('BEGIN IMMEDIATE');
  try {
    if (!database.prepare('SELECT 1 FROM bathrooms WHERE id = ?').get(bathroomId)) {
      throw new BathroomNotFoundError();
    }

    const existing = database.prepare(`
      SELECT 1 FROM reviews
      WHERE installation_id = ? AND bathroom_id = ? AND review_day = ?
    `).get(installationId, bathroomId, day);
    if (existing) throw new ReviewConflictError();

    database.prepare(`
      INSERT INTO reviews
        (bathroom_id, installation_id, review_day, cleanliness, busyness, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(bathroomId, installationId, day, cleanliness, busyness, timestamp);
    database.prepare(`
      UPDATE bathrooms SET busyness = ?, busyness_reported_at = ? WHERE id = ?
    `).run(busyness, timestamp, bathroomId);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    if (error.code === 'ERR_SQLITE_ERROR' && /UNIQUE constraint failed/.test(error.message)) {
      throw new ReviewConflictError();
    }
    throw error;
  }

  return getBathroomSummary(database, bathroomId, installationId, now);
}

function validateReviewInput(input) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('A review request body is required.'), { statusCode: 400 });
  }

  const { bathroomId, installationId, cleanliness, busyness } = input;
  if (typeof bathroomId !== 'string' || bathroomId.length === 0) {
    throw Object.assign(new Error('A bathroom ID is required.'), { statusCode: 400 });
  }
  if (!Number.isInteger(cleanliness) || cleanliness < 1 || cleanliness > 5) {
    throw Object.assign(new Error('Cleanliness must be a whole number from 1 to 5.'), { statusCode: 400 });
  }
  if (!busynessLevels.includes(busyness)) {
    throw Object.assign(new Error('Busyness must be Low, Medium, or High.'), { statusCode: 400 });
  }
  if (typeof installationId !== 'string' || !/^[A-Za-z0-9._:-]{8,128}$/.test(installationId)) {
    throw Object.assign(new Error('A valid anonymous installation ID is required.'), { statusCode: 400 });
  }
  return { bathroomId, installationId, cleanliness, busyness };
}

module.exports = {
  BathroomNotFoundError,
  ReviewConflictError,
  getBathroomSummaries,
  getBathroomSummary,
  getLosAngelesDay,
  submitReview,
};