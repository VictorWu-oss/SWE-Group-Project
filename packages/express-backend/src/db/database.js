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
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      demo INTEGER NOT NULL DEFAULT 1,
      busyness TEXT,
      busyness_reported_at TEXT
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
  `);
  return database;
}

function seedBathrooms(database, seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'))) {
  const upsert = database.prepare(`
    INSERT INTO bathrooms (id, name, building, latitude, longitude, demo)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      building = excluded.building,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      demo = excluded.demo
  `);

  for (const bathroom of seedData) {
    upsert.run(
      bathroom.id,
      bathroom.name,
      bathroom.building,
      bathroom.latitude,
      bathroom.longitude,
      bathroom.demo ? 1 : 0,
    );
  }
}

module.exports = { createDatabase, seedBathrooms };