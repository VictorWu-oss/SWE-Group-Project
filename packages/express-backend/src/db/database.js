const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const seedPath = path.join(__dirname, '../../data/bathrooms.seed.json');

function createDatabase(databasePath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/toilet-tracker.sqlite')) {
  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const database = new DatabaseSync(databasePath);
  database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  database.exec(`
    CREATE TABLE IF NOT EXISTS bathrooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      building TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      demo INTEGER NOT NULL DEFAULT 1,
      busyness TEXT,
      busyness_reported_at TEXT,
      restroom_type TEXT,
      amenities_json TEXT,
      accessibility_json TEXT,
      hours_json TEXT,
      timezone TEXT,
      indoor_directions TEXT,
      safety_info_json TEXT,
      directory_verified INTEGER NOT NULL DEFAULT 0,
      verification_source TEXT,
      verified_at TEXT,
      verified_by TEXT
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bathroom_id TEXT NOT NULL REFERENCES bathrooms(id),
      installation_id TEXT NOT NULL,
      review_day TEXT NOT NULL,
      cleanliness INTEGER NOT NULL CHECK (cleanliness BETWEEN 1 AND 5),
      busyness TEXT NOT NULL CHECK (busyness IN ('Low', 'Medium', 'High')),
      created_at TEXT NOT NULL,
      UNIQUE (installation_id, bathroom_id, review_day)
    );
    CREATE INDEX IF NOT EXISTS reviews_bathroom_idx ON reviews(bathroom_id);
    -- Credentials for sign-in (#64). Sign-up (#63) writes to this table;
    -- only bcrypt hashes are stored, never plain passwords.
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  migrateBathroomDirectory(database);
  database.exec(`
  CREATE TABLE IF NOT EXISTS maintenance_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bathroom_id TEXT NOT NULL REFERENCES bathrooms(id),
    installation_id TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('cleanliness', 'supplies', 'fixture', 'accessibility', 'safety', 'other')),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT
  );
  CREATE INDEX IF NOT EXISTS maintenance_bathroom_idx
    ON maintenance_reports(bathroom_id, created_at DESC);
  `);
  return database;
}

function migrateBathroomDirectory(database) {
  const columns = new Map(
  database.prepare('PRAGMA table_info(bathrooms)').all().map((column) => [column.name, column]),
  );
  const additions = {
  restroom_type: 'TEXT',
  amenities_json: 'TEXT',
  accessibility_json: 'TEXT',
  hours_json: 'TEXT',
  timezone: 'TEXT',
  indoor_directions: 'TEXT',
  safety_info_json: 'TEXT',
  directory_verified: 'INTEGER NOT NULL DEFAULT 0',
  verification_source: 'TEXT',
  verified_at: 'TEXT',
  verified_by: 'TEXT',
  };
  for (const [name, definition] of Object.entries(additions)) {
  if (!columns.has(name)) database.exec(`ALTER TABLE bathrooms ADD COLUMN ${name} ${definition}`);
  }

  const hasRequiredCoordinates = columns.get('latitude')?.notnull || columns.get('longitude')?.notnull;
  if (!hasRequiredCoordinates) return;

  database.exec('PRAGMA foreign_keys = OFF');
  try {
  database.exec(`
    BEGIN IMMEDIATE;
    CREATE TABLE bathrooms_new (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      building TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      demo INTEGER NOT NULL DEFAULT 1,
      busyness TEXT,
      busyness_reported_at TEXT,
      restroom_type TEXT,
      amenities_json TEXT,
      accessibility_json TEXT,
      hours_json TEXT,
      timezone TEXT,
      indoor_directions TEXT,
      safety_info_json TEXT,
      directory_verified INTEGER NOT NULL DEFAULT 0,
      verification_source TEXT,
      verified_at TEXT,
      verified_by TEXT
    );
    INSERT INTO bathrooms_new (
      id, name, building, latitude, longitude, demo, busyness, busyness_reported_at,
      restroom_type, amenities_json, accessibility_json, hours_json, timezone,
      indoor_directions, safety_info_json, directory_verified, verification_source,
      verified_at, verified_by
    )
    SELECT
      id, name, building, latitude, longitude, demo, busyness, busyness_reported_at,
      restroom_type, amenities_json, accessibility_json, hours_json, timezone,
      indoor_directions, safety_info_json, directory_verified, verification_source,
      verified_at, verified_by
    FROM bathrooms;
    DROP TABLE bathrooms;
    ALTER TABLE bathrooms_new RENAME TO bathrooms;
    COMMIT;
  `);
  } catch (error) {
  database.exec('ROLLBACK');
  throw error;
  } finally {
  database.exec('PRAGMA foreign_keys = ON');
  }
}

function seedBathrooms(database, seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'))) {
  const upsert = database.prepare(`
  INSERT INTO bathrooms (
    id, name, building, latitude, longitude, demo, restroom_type,
    directory_verified, verification_source, verified_at, verified_by
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    building = excluded.building,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    demo = excluded.demo,
    restroom_type = excluded.restroom_type,
    directory_verified = excluded.directory_verified,
    verification_source = excluded.verification_source,
    verified_at = excluded.verified_at,
    verified_by = excluded.verified_by
  WHERE bathrooms.directory_verified = 0
  `);

  for (const bathroom of seedData) {
    upsert.run(
      bathroom.id,
      bathroom.name,
      bathroom.building,
      bathroom.latitude ?? null,
      bathroom.longitude ?? null,
      bathroom.demo ? 1 : 0,
      bathroom.restroomType || null,
      bathroom.directoryVerified ? 1 : 0,
      bathroom.verificationSource || null,
      bathroom.verifiedAt || null,
      bathroom.verifiedBy || null,
    );
  }
}

module.exports = { createDatabase, migrateBathroomDirectory, seedBathrooms };
