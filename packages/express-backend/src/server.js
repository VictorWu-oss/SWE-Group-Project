const { createDatabase, seedBathrooms } = require('./db/database');
const { createApiApp } = require('./app');

const database = createDatabase();
seedBathrooms(database);
const app = createApiApp(database);

const port = Number(process.env.PORT || 3000);
app.listen(port, '0.0.0.0', (error) => {
  if (error) {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `Port ${port} is already in use. The API may already be running in another terminal.`
        + ' Stop it with Ctrl+C, or set PORT in packages/express-backend/.env.',
      );
    } else {
      console.error('ToiletTracker API failed to start:', error);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`ToiletTracker API listening on http://0.0.0.0:${port}`);
});
