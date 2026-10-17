const losAngelesDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

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

function getBathroomSummaries(database, installationId, date = new Date()) {
  const day = getLosAngelesDay(date);
  const rows = database.prepare(`
    SELECT b.id, b.name, b.building, b.latitude, b.longitude, b.demo,
      b.busyness, b.busyness_reported_at,
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
    GROUP BY b.id
    ORDER BY b.name COLLATE NOCASE
  `).all(installationId, day);

  return rows.map(mapBathroom);
}

function getBathroomSummary(database, bathroomId, installationId, date = new Date()) {
  return getBathroomSummaries(database, installationId, date)
    .find((bathroom) => bathroom.id === bathroomId) || null;
}

function mapBathroom(row) {
  return {
    id: row.id,
    name: row.name,
    building: row.building,
    latitude: row.latitude,
    longitude: row.longitude,
    demo: Boolean(row.demo),
    averageCleanliness: row.average_cleanliness == null
      ? null
      : Number(row.average_cleanliness.toFixed(1)),
    reviewCount: row.review_count,
    busyness: row.busyness,
    busynessReportedAt: row.busyness_reported_at,
    reviewedToday: Boolean(row.reviewed_today),
  };
}

function submitReview(database, input, now = new Date()) {
  const { bathroomId, installationId, cleanliness, busyness } = input;
  if (!Number.isInteger(cleanliness) || cleanliness < 1 || cleanliness > 5) {
    throw Object.assign(new Error('Cleanliness must be a whole number from 1 to 5.'), { statusCode: 400 });
  }
  if (!['Low', 'Medium', 'High'].includes(busyness)) {
    throw Object.assign(new Error('Busyness must be Low, Medium, or High.'), { statusCode: 400 });
  }
  if (typeof installationId !== 'string' || !/^[A-Za-z0-9._:-]{8,128}$/.test(installationId)) {
    throw Object.assign(new Error('A valid anonymous installation ID is required.'), { statusCode: 400 });
  }

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

module.exports = {
  BathroomNotFoundError,
  ReviewConflictError,
  getBathroomSummaries,
  getBathroomSummary,
  getLosAngelesDay,
  submitReview,
};