const cors = require('cors');
const express = require('express');
const { createBathroomRouter } = require('./routes/bathroomRoutes');
const { createRoutingRouter } = require('./routes/routingRoutes');

function createApiApp(database, {
  adminToken = process.env.ADMIN_API_TOKEN,
  adminName = process.env.ADMIN_DISPLAY_NAME || 'authorized administrator',
  routingFetch,
} = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
  app.use('/api/bathrooms', createBathroomRouter(database, { adminToken, adminName }));
  app.use('/api/routes', createRoutingRouter({ routingFetch }));
  app.use((error, _request, response, _next) => {
    if (error instanceof SyntaxError && 'body' in error) {
      return response.status(400).json({ error: 'Request body must be valid JSON.' });
    }
    console.error(error);
    return response.status(500).json({ error: 'The server could not complete the request.' });
  });
  return app;
}

module.exports = { createApiApp };
