const cors = require('cors');
const express = require('express');
const { createBathroomRouter } = require('./routes/bathroomRoutes');

function createApiApp(database) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
  app.use('/api/bathrooms', createBathroomRouter(database));
  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({ error: 'The server could not complete the request.' });
  });
  return app;
}

module.exports = { createApiApp };