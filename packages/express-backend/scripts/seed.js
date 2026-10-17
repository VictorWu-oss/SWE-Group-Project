const { createDatabase, seedBathrooms } = require('../src/db/database');

const database = createDatabase();
seedBathrooms(database);
database.close();
console.log('Bathroom seed data applied. All seed locations are marked demo.');