const CATEGORIES = ['cleanliness', 'supplies', 'fixture', 'accessibility', 'safety', 'other'];
const STATUSES = ['open', 'in_progress', 'resolved', 'dismissed'];

class MaintenanceNotFoundError extends Error {
  constructor() {
    super('Maintenance report not found.');
    this.statusCode = 404;
  }
}

function createMaintenanceReport(database, bathroomId, input, now = new Date()) {
  if (!isRecord(input)) throw validationError('A maintenance report body is required.');
  const { installationId, category, description } = input;
  if (!CATEGORIES.includes(category)) {
    throw validationError(`Category must be one of: ${CATEGORIES.join(', ')}.`);
  }
  if (typeof description !== 'string' || description.trim().length < 5 || description.trim().length > 500) {
    throw validationError('Description must contain between 5 and 500 characters.');
  }
  if (typeof installationId !== 'string' || !/^[A-Za-z0-9._:-]{8,128}$/.test(installationId)) {
    throw validationError('A valid anonymous installation ID is required.');
  }
  if (!database.prepare('SELECT 1 FROM bathrooms WHERE id = ?').get(bathroomId)) {
    throw Object.assign(new Error('Bathroom not found.'), { statusCode: 404 });
  }

  const timestamp = now.toISOString();
  const result = database.prepare(`
    INSERT INTO maintenance_reports
      (bathroom_id, installation_id, category, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'open', ?, ?)
  `).run(bathroomId, installationId, category, description.trim(), timestamp, timestamp);
  return getMaintenanceReport(database, Number(result.lastInsertRowid));
}

function getMaintenanceReports(database, bathroomId) {
  return database.prepare(`
    SELECT id, bathroom_id, category, description, status, created_at, updated_at
    FROM maintenance_reports
    WHERE bathroom_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(bathroomId).map(mapReport);
}

function updateMaintenanceStatus(database, reportId, input, now = new Date(), adminName = 'authorized administrator') {
  if (!isRecord(input) || !STATUSES.includes(input.status)) {
    throw validationError(`Status must be one of: ${STATUSES.join(', ')}.`);
  }
  const result = database.prepare(`
    UPDATE maintenance_reports
    SET status = ?, updated_at = ?, updated_by = ?
    WHERE id = ?
  `).run(input.status, now.toISOString(), adminName, reportId);
  if (result.changes === 0) throw new MaintenanceNotFoundError();
  return getMaintenanceReport(database, reportId);
}

function getMaintenanceReport(database, id) {
  const row = database.prepare(`
    SELECT id, bathroom_id, category, description, status, created_at, updated_at
    FROM maintenance_reports WHERE id = ?
  `).get(id);
  return row ? mapReport(row) : null;
}

function mapReport(row) {
  return {
    id: row.id,
    bathroomId: row.bathroom_id,
    category: row.category,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validationError(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

module.exports = {
  CATEGORIES,
  STATUSES,
  createMaintenanceReport,
  getMaintenanceReports,
  updateMaintenanceStatus,
};
