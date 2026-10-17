const { createDatabase, seedBathrooms } = require('./db/database');
const { createApiApp } = require('./app');

const database = createDatabase();
seedBathrooms(database);
const app = createApiApp(database);

const port = Number(process.env.PORT || 3000);
app.listen(port, '0.0.0.0', () => {
  console.log(`ToiletTracker API listening on http://0.0.0.0:${port}`);
});